# bash completion for openbeam                            -*- shell-script -*-

__openbeam_debug()
{
    if [[ -n ${BASH_COMP_DEBUG_FILE:-} ]]; then
        echo "$*" >> "${BASH_COMP_DEBUG_FILE}"
    fi
}

# Homebrew on Macs have version 1.3 of bash-completion which doesn't include
# _init_completion. This is a very minimal version of that function.
__openbeam_init_completion()
{
    COMPREPLY=()
    _get_comp_words_by_ref "$@" cur prev words cword
}

__openbeam_index_of_word()
{
    local w word=$1
    shift
    index=0
    for w in "$@"; do
        [[ $w = "$word" ]] && return
        index=$((index+1))
    done
    index=-1
}

__openbeam_contains_word()
{
    local w word=$1; shift
    for w in "$@"; do
        [[ $w = "$word" ]] && return
    done
    return 1
}

__openbeam_handle_go_custom_completion()
{
    __openbeam_debug "${FUNCNAME[0]}: cur is ${cur}, words[*] is ${words[*]}, #words[@] is ${#words[@]}"

    local shellCompDirectiveError=1
    local shellCompDirectiveNoSpace=2
    local shellCompDirectiveNoFileComp=4
    local shellCompDirectiveFilterFileExt=8
    local shellCompDirectiveFilterDirs=16

    local out requestComp lastParam lastChar comp directive args

    # Prepare the command to request completions for the program.
    # Calling ${words[0]} instead of directly openbeam allows handling aliases
    args=("${words[@]:1}")
    # Disable ActiveHelp which is not supported for bash completion v1
    requestComp="OPENBEAM_ACTIVE_HELP=0 ${words[0]} __completeNoDesc ${args[*]}"

    lastParam=${words[$((${#words[@]}-1))]}
    lastChar=${lastParam:$((${#lastParam}-1)):1}
    __openbeam_debug "${FUNCNAME[0]}: lastParam ${lastParam}, lastChar ${lastChar}"

    if [ -z "${cur}" ] && [ "${lastChar}" != "=" ]; then
        # If the last parameter is complete (there is a space following it)
        # We add an extra empty parameter so we can indicate this to the go method.
        __openbeam_debug "${FUNCNAME[0]}: Adding extra empty parameter"
        requestComp="${requestComp} \"\""
    fi

    __openbeam_debug "${FUNCNAME[0]}: calling ${requestComp}"
    # Use eval to handle any environment variables and such
    out=$(eval "${requestComp}" 2>/dev/null)

    # Extract the directive integer at the very end of the output following a colon (:)
    directive=${out##*:}
    # Remove the directive
    out=${out%:*}
    if [ "${directive}" = "${out}" ]; then
        # There is not directive specified
        directive=0
    fi
    __openbeam_debug "${FUNCNAME[0]}: the completion directive is: ${directive}"
    __openbeam_debug "${FUNCNAME[0]}: the completions are: ${out}"

    if [ $((directive & shellCompDirectiveError)) -ne 0 ]; then
        # Error code.  No completion.
        __openbeam_debug "${FUNCNAME[0]}: received error from custom completion go code"
        return
    else
        if [ $((directive & shellCompDirectiveNoSpace)) -ne 0 ]; then
            if [[ $(type -t compopt) = "builtin" ]]; then
                __openbeam_debug "${FUNCNAME[0]}: activating no space"
                compopt -o nospace
            fi
        fi
        if [ $((directive & shellCompDirectiveNoFileComp)) -ne 0 ]; then
            if [[ $(type -t compopt) = "builtin" ]]; then
                __openbeam_debug "${FUNCNAME[0]}: activating no file completion"
                compopt +o default
            fi
        fi
    fi

    if [ $((directive & shellCompDirectiveFilterFileExt)) -ne 0 ]; then
        # File extension filtering
        local fullFilter filter filteringCmd
        # Do not use quotes around the $out variable or else newline
        # characters will be kept.
        for filter in ${out}; do
            fullFilter+="$filter|"
        done

        filteringCmd="_filedir $fullFilter"
        __openbeam_debug "File filtering command: $filteringCmd"
        $filteringCmd
    elif [ $((directive & shellCompDirectiveFilterDirs)) -ne 0 ]; then
        # File completion for directories only
        local subdir
        # Use printf to strip any trailing newline
        subdir=$(printf "%s" "${out}")
        if [ -n "$subdir" ]; then
            __openbeam_debug "Listing directories in $subdir"
            __openbeam_handle_subdirs_in_dir_flag "$subdir"
        else
            __openbeam_debug "Listing directories in ."
            _filedir -d
        fi
    else
        while IFS='' read -r comp; do
            COMPREPLY+=("$comp")
        done < <(compgen -W "${out}" -- "$cur")
    fi
}

__openbeam_handle_reply()
{
    __openbeam_debug "${FUNCNAME[0]}"
    local comp
    case $cur in
        -*)
            if [[ $(type -t compopt) = "builtin" ]]; then
                compopt -o nospace
            fi
            local allflags
            if [ ${#must_have_one_flag[@]} -ne 0 ]; then
                allflags=("${must_have_one_flag[@]}")
            else
                allflags=("${flags[*]} ${two_word_flags[*]}")
            fi
            while IFS='' read -r comp; do
                COMPREPLY+=("$comp")
            done < <(compgen -W "${allflags[*]}" -- "$cur")
            if [[ $(type -t compopt) = "builtin" ]]; then
                [[ "${COMPREPLY[0]}" == *= ]] || compopt +o nospace
            fi

            # complete after --flag=abc
            if [[ $cur == *=* ]]; then
                if [[ $(type -t compopt) = "builtin" ]]; then
                    compopt +o nospace
                fi

                local index flag
                flag="${cur%=*}"
                __openbeam_index_of_word "${flag}" "${flags_with_completion[@]}"
                COMPREPLY=()
                if [[ ${index} -ge 0 ]]; then
                    PREFIX=""
                    cur="${cur#*=}"
                    ${flags_completion[${index}]}
                    if [ -n "${ZSH_VERSION:-}" ]; then
                        # zsh completion needs --flag= prefix
                        eval "COMPREPLY=( \"\${COMPREPLY[@]/#/${flag}=}\" )"
                    fi
                fi
            fi

            if [[ -z "${flag_parsing_disabled}" ]]; then
                # If flag parsing is enabled, we have completed the flags and can return.
                # If flag parsing is disabled, we may not know all (or any) of the flags, so we fallthrough
                # to possibly call handle_go_custom_completion.
                return 0;
            fi
            ;;
    esac

    # check if we are handling a flag with special work handling
    local index
    __openbeam_index_of_word "${prev}" "${flags_with_completion[@]}"
    if [[ ${index} -ge 0 ]]; then
        ${flags_completion[${index}]}
        return
    fi

    # we are parsing a flag and don't have a special handler, no completion
    if [[ ${cur} != "${words[cword]}" ]]; then
        return
    fi

    local completions
    completions=("${commands[@]}")
    if [[ ${#must_have_one_noun[@]} -ne 0 ]]; then
        completions+=("${must_have_one_noun[@]}")
    elif [[ -n "${has_completion_function}" ]]; then
        # if a go completion function is provided, defer to that function
        __openbeam_handle_go_custom_completion
    fi
    if [[ ${#must_have_one_flag[@]} -ne 0 ]]; then
        completions+=("${must_have_one_flag[@]}")
    fi
    while IFS='' read -r comp; do
        COMPREPLY+=("$comp")
    done < <(compgen -W "${completions[*]}" -- "$cur")

    if [[ ${#COMPREPLY[@]} -eq 0 && ${#noun_aliases[@]} -gt 0 && ${#must_have_one_noun[@]} -ne 0 ]]; then
        while IFS='' read -r comp; do
            COMPREPLY+=("$comp")
        done < <(compgen -W "${noun_aliases[*]}" -- "$cur")
    fi

    if [[ ${#COMPREPLY[@]} -eq 0 ]]; then
        if declare -F __openbeam_custom_func >/dev/null; then
            # try command name qualified custom func
            __openbeam_custom_func
        else
            # otherwise fall back to unqualified for compatibility
            declare -F __custom_func >/dev/null && __custom_func
        fi
    fi

    # available in bash-completion >= 2, not always present on macOS
    if declare -F __ltrim_colon_completions >/dev/null; then
        __ltrim_colon_completions "$cur"
    fi

    # If there is only 1 completion and it is a flag with an = it will be completed
    # but we don't want a space after the =
    if [[ "${#COMPREPLY[@]}" -eq "1" ]] && [[ $(type -t compopt) = "builtin" ]] && [[ "${COMPREPLY[0]}" == --*= ]]; then
       compopt -o nospace
    fi
}

# The arguments should be in the form "ext1|ext2|extn"
__openbeam_handle_filename_extension_flag()
{
    local ext="$1"
    _filedir "@(${ext})"
}

__openbeam_handle_subdirs_in_dir_flag()
{
    local dir="$1"
    pushd "${dir}" >/dev/null 2>&1 && _filedir -d && popd >/dev/null 2>&1 || return
}

__openbeam_handle_flag()
{
    __openbeam_debug "${FUNCNAME[0]}: c is $c words[c] is ${words[c]}"

    # if a command required a flag, and we found it, unset must_have_one_flag()
    local flagname=${words[c]}
    local flagvalue=""
    # if the word contained an =
    if [[ ${words[c]} == *"="* ]]; then
        flagvalue=${flagname#*=} # take in as flagvalue after the =
        flagname=${flagname%=*} # strip everything after the =
        flagname="${flagname}=" # but put the = back
    fi
    __openbeam_debug "${FUNCNAME[0]}: looking for ${flagname}"
    if __openbeam_contains_word "${flagname}" "${must_have_one_flag[@]}"; then
        must_have_one_flag=()
    fi

    # if you set a flag which only applies to this command, don't show subcommands
    if __openbeam_contains_word "${flagname}" "${local_nonpersistent_flags[@]}"; then
      commands=()
    fi

    # keep flag value with flagname as flaghash
    # flaghash variable is an associative array which is only supported in bash > 3.
    if [[ -z "${BASH_VERSION:-}" || "${BASH_VERSINFO[0]:-}" -gt 3 ]]; then
        if [ -n "${flagvalue}" ] ; then
            flaghash[${flagname}]=${flagvalue}
        elif [ -n "${words[ $((c+1)) ]}" ] ; then
            flaghash[${flagname}]=${words[ $((c+1)) ]}
        else
            flaghash[${flagname}]="true" # pad "true" for bool flag
        fi
    fi

    # skip the argument to a two word flag
    if [[ ${words[c]} != *"="* ]] && __openbeam_contains_word "${words[c]}" "${two_word_flags[@]}"; then
        __openbeam_debug "${FUNCNAME[0]}: found a flag ${words[c]}, skip the next argument"
        c=$((c+1))
        # if we are looking for a flags value, don't show commands
        if [[ $c -eq $cword ]]; then
            commands=()
        fi
    fi

    c=$((c+1))

}

__openbeam_handle_noun()
{
    __openbeam_debug "${FUNCNAME[0]}: c is $c words[c] is ${words[c]}"

    if __openbeam_contains_word "${words[c]}" "${must_have_one_noun[@]}"; then
        must_have_one_noun=()
    elif __openbeam_contains_word "${words[c]}" "${noun_aliases[@]}"; then
        must_have_one_noun=()
    fi

    nouns+=("${words[c]}")
    c=$((c+1))
}

__openbeam_handle_command()
{
    __openbeam_debug "${FUNCNAME[0]}: c is $c words[c] is ${words[c]}"

    local next_command
    if [[ -n ${last_command} ]]; then
        next_command="_${last_command}_${words[c]//:/__}"
    else
        if [[ $c -eq 0 ]]; then
            next_command="_openbeam_root_command"
        else
            next_command="_${words[c]//:/__}"
        fi
    fi
    c=$((c+1))
    __openbeam_debug "${FUNCNAME[0]}: looking for ${next_command}"
    declare -F "$next_command" >/dev/null && $next_command
}

__openbeam_handle_word()
{
    if [[ $c -ge $cword ]]; then
        __openbeam_handle_reply
        return
    fi
    __openbeam_debug "${FUNCNAME[0]}: c is $c words[c] is ${words[c]}"
    if [[ "${words[c]}" == -* ]]; then
        __openbeam_handle_flag
    elif __openbeam_contains_word "${words[c]}" "${commands[@]}"; then
        __openbeam_handle_command
    elif [[ $c -eq 0 ]]; then
        __openbeam_handle_command
    elif __openbeam_contains_word "${words[c]}" "${command_aliases[@]}"; then
        # aliashash variable is an associative array which is only supported in bash > 3.
        if [[ -z "${BASH_VERSION:-}" || "${BASH_VERSINFO[0]:-}" -gt 3 ]]; then
            words[c]=${aliashash[${words[c]}]}
            __openbeam_handle_command
        else
            __openbeam_handle_noun
        fi
    else
        __openbeam_handle_noun
    fi
    __openbeam_handle_word
}

_openbeam_agent_run()
{
    last_command="openbeam_agent_run"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--agent-type=")
    two_word_flags+=("--agent-type")
    local_nonpersistent_flags+=("--agent-type")
    local_nonpersistent_flags+=("--agent-type=")
    flags+=("--max-steps=")
    two_word_flags+=("--max-steps")
    local_nonpersistent_flags+=("--max-steps")
    local_nonpersistent_flags+=("--max-steps=")
    flags+=("--prompt=")
    two_word_flags+=("--prompt")
    two_word_flags+=("-p")
    local_nonpersistent_flags+=("--prompt")
    local_nonpersistent_flags+=("--prompt=")
    local_nonpersistent_flags+=("-p")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--prompt=")
    must_have_one_flag+=("-p")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_agent_stream()
{
    last_command="openbeam_agent_stream"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--agent-type=")
    two_word_flags+=("--agent-type")
    local_nonpersistent_flags+=("--agent-type")
    local_nonpersistent_flags+=("--agent-type=")
    flags+=("--max-steps=")
    two_word_flags+=("--max-steps")
    local_nonpersistent_flags+=("--max-steps")
    local_nonpersistent_flags+=("--max-steps=")
    flags+=("--prompt=")
    two_word_flags+=("--prompt")
    two_word_flags+=("-p")
    local_nonpersistent_flags+=("--prompt")
    local_nonpersistent_flags+=("--prompt=")
    local_nonpersistent_flags+=("-p")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--prompt=")
    must_have_one_flag+=("-p")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_agent()
{
    last_command="openbeam_agent"

    command_aliases=()

    commands=()
    commands+=("run")
    commands+=("stream")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_cost-breakdown()
{
    last_command="openbeam_analytics_cost-breakdown"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--end-date=")
    two_word_flags+=("--end-date")
    local_nonpersistent_flags+=("--end-date")
    local_nonpersistent_flags+=("--end-date=")
    flags+=("--group-by=")
    two_word_flags+=("--group-by")
    local_nonpersistent_flags+=("--group-by")
    local_nonpersistent_flags+=("--group-by=")
    flags+=("--start-date=")
    two_word_flags+=("--start-date")
    local_nonpersistent_flags+=("--start-date")
    local_nonpersistent_flags+=("--start-date=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--end-date=")
    must_have_one_flag+=("--start-date=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_spreadsheets_generate-sql()
{
    last_command="openbeam_analytics_spreadsheets_generate-sql"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--document-id=")
    two_word_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id=")
    flags+=("--question=")
    two_word_flags+=("--question")
    local_nonpersistent_flags+=("--question")
    local_nonpersistent_flags+=("--question=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--document-id=")
    must_have_one_flag+=("--question=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_spreadsheets_list()
{
    last_command="openbeam_analytics_spreadsheets_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_spreadsheets_query()
{
    last_command="openbeam_analytics_spreadsheets_query"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--document-id=")
    two_word_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id=")
    flags+=("--max-rows=")
    two_word_flags+=("--max-rows")
    local_nonpersistent_flags+=("--max-rows")
    local_nonpersistent_flags+=("--max-rows=")
    flags+=("--sql=")
    two_word_flags+=("--sql")
    local_nonpersistent_flags+=("--sql")
    local_nonpersistent_flags+=("--sql=")
    flags+=("--timeout-ms=")
    two_word_flags+=("--timeout-ms")
    local_nonpersistent_flags+=("--timeout-ms")
    local_nonpersistent_flags+=("--timeout-ms=")
    flags+=("--view-name=")
    two_word_flags+=("--view-name")
    local_nonpersistent_flags+=("--view-name")
    local_nonpersistent_flags+=("--view-name=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--document-id=")
    must_have_one_flag+=("--sql=")
    must_have_one_flag+=("--view-name=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_spreadsheets_schema()
{
    last_command="openbeam_analytics_spreadsheets_schema"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--document-id=")
    two_word_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id=")
    flags+=("--sheet=")
    two_word_flags+=("--sheet")
    local_nonpersistent_flags+=("--sheet")
    local_nonpersistent_flags+=("--sheet=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--document-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_spreadsheets()
{
    last_command="openbeam_analytics_spreadsheets"

    command_aliases=()

    commands=()
    commands+=("generate-sql")
    commands+=("list")
    commands+=("query")
    commands+=("schema")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_top-cost-drivers()
{
    last_command="openbeam_analytics_top-cost-drivers"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--dimension=")
    two_word_flags+=("--dimension")
    local_nonpersistent_flags+=("--dimension")
    local_nonpersistent_flags+=("--dimension=")
    flags+=("--end-date=")
    two_word_flags+=("--end-date")
    local_nonpersistent_flags+=("--end-date")
    local_nonpersistent_flags+=("--end-date=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--start-date=")
    two_word_flags+=("--start-date")
    local_nonpersistent_flags+=("--start-date")
    local_nonpersistent_flags+=("--start-date=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--end-date=")
    must_have_one_flag+=("--start-date=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics_usage-trend()
{
    last_command="openbeam_analytics_usage-trend"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--end-date=")
    two_word_flags+=("--end-date")
    local_nonpersistent_flags+=("--end-date")
    local_nonpersistent_flags+=("--end-date=")
    flags+=("--granularity=")
    two_word_flags+=("--granularity")
    local_nonpersistent_flags+=("--granularity")
    local_nonpersistent_flags+=("--granularity=")
    flags+=("--start-date=")
    two_word_flags+=("--start-date")
    local_nonpersistent_flags+=("--start-date")
    local_nonpersistent_flags+=("--start-date=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--end-date=")
    must_have_one_flag+=("--start-date=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_analytics()
{
    last_command="openbeam_analytics"

    command_aliases=()

    commands=()
    commands+=("cost-breakdown")
    commands+=("spreadsheets")
    commands+=("top-cost-drivers")
    commands+=("usage-trend")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_key_create()
{
    last_command="openbeam_auth_key_create"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--expires-at=")
    two_word_flags+=("--expires-at")
    local_nonpersistent_flags+=("--expires-at")
    local_nonpersistent_flags+=("--expires-at=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--scope=")
    two_word_flags+=("--scope")
    local_nonpersistent_flags+=("--scope")
    local_nonpersistent_flags+=("--scope=")
    flags+=("--team-id=")
    two_word_flags+=("--team-id")
    local_nonpersistent_flags+=("--team-id")
    local_nonpersistent_flags+=("--team-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_key_list()
{
    last_command="openbeam_auth_key_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--team-id=")
    two_word_flags+=("--team-id")
    local_nonpersistent_flags+=("--team-id")
    local_nonpersistent_flags+=("--team-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_key_revoke()
{
    last_command="openbeam_auth_key_revoke"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--team-id=")
    two_word_flags+=("--team-id")
    local_nonpersistent_flags+=("--team-id")
    local_nonpersistent_flags+=("--team-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_key()
{
    last_command="openbeam_auth_key"

    command_aliases=()

    commands=()
    commands+=("create")
    commands+=("list")
    commands+=("revoke")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_login()
{
    last_command="openbeam_auth_login"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--api-key=")
    two_word_flags+=("--api-key")
    local_nonpersistent_flags+=("--api-key")
    local_nonpersistent_flags+=("--api-key=")
    flags+=("--skip-verify")
    local_nonpersistent_flags+=("--skip-verify")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_logout()
{
    last_command="openbeam_auth_logout"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_status()
{
    last_command="openbeam_auth_status"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--verify")
    local_nonpersistent_flags+=("--verify")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_token_print()
{
    last_command="openbeam_auth_token_print"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--redact")
    local_nonpersistent_flags+=("--redact")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth_token()
{
    last_command="openbeam_auth_token"

    command_aliases=()

    commands=()
    commands+=("print")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_auth()
{
    last_command="openbeam_auth"

    command_aliases=()

    commands=()
    commands+=("key")
    commands+=("login")
    commands+=("logout")
    commands+=("status")
    commands+=("token")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_cancel()
{
    last_command="openbeam_background-agents_cancel"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_create()
{
    last_command="openbeam_background-agents_create"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--base-branch=")
    two_word_flags+=("--base-branch")
    local_nonpersistent_flags+=("--base-branch")
    local_nonpersistent_flags+=("--base-branch=")
    flags+=("--description=")
    two_word_flags+=("--description")
    local_nonpersistent_flags+=("--description")
    local_nonpersistent_flags+=("--description=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--preset=")
    two_word_flags+=("--preset")
    local_nonpersistent_flags+=("--preset")
    local_nonpersistent_flags+=("--preset=")
    flags+=("--prompt=")
    two_word_flags+=("--prompt")
    local_nonpersistent_flags+=("--prompt")
    local_nonpersistent_flags+=("--prompt=")
    flags+=("--repository-url=")
    two_word_flags+=("--repository-url")
    local_nonpersistent_flags+=("--repository-url")
    local_nonpersistent_flags+=("--repository-url=")
    flags+=("--sandbox-type=")
    two_word_flags+=("--sandbox-type")
    local_nonpersistent_flags+=("--sandbox-type")
    local_nonpersistent_flags+=("--sandbox-type=")
    flags+=("--timeout-ms=")
    two_word_flags+=("--timeout-ms")
    local_nonpersistent_flags+=("--timeout-ms")
    local_nonpersistent_flags+=("--timeout-ms=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_flag+=("--prompt=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_delete()
{
    last_command="openbeam_background-agents_delete"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_get()
{
    last_command="openbeam_background-agents_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_list()
{
    last_command="openbeam_background-agents_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--status=")
    two_word_flags+=("--status")
    local_nonpersistent_flags+=("--status")
    local_nonpersistent_flags+=("--status=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_logs()
{
    last_command="openbeam_background-agents_logs"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--follow")
    local_nonpersistent_flags+=("--follow")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--interval=")
    two_word_flags+=("--interval")
    local_nonpersistent_flags+=("--interval")
    local_nonpersistent_flags+=("--interval=")
    flags+=("--level=")
    two_word_flags+=("--level")
    local_nonpersistent_flags+=("--level")
    local_nonpersistent_flags+=("--level=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_pause()
{
    last_command="openbeam_background-agents_pause"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents_resume()
{
    last_command="openbeam_background-agents_resume"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--from-checkpoint=")
    two_word_flags+=("--from-checkpoint")
    local_nonpersistent_flags+=("--from-checkpoint")
    local_nonpersistent_flags+=("--from-checkpoint=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_background-agents()
{
    last_command="openbeam_background-agents"

    command_aliases=()

    commands=()
    commands+=("cancel")
    commands+=("create")
    commands+=("delete")
    commands+=("get")
    commands+=("list")
    commands+=("logs")
    commands+=("pause")
    commands+=("resume")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_create()
{
    last_command="openbeam_canvas_create"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--description=")
    two_word_flags+=("--description")
    local_nonpersistent_flags+=("--description")
    local_nonpersistent_flags+=("--description=")
    flags+=("--edges=")
    two_word_flags+=("--edges")
    local_nonpersistent_flags+=("--edges")
    local_nonpersistent_flags+=("--edges=")
    flags+=("--icon=")
    two_word_flags+=("--icon")
    local_nonpersistent_flags+=("--icon")
    local_nonpersistent_flags+=("--icon=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--nodes=")
    two_word_flags+=("--nodes")
    local_nonpersistent_flags+=("--nodes")
    local_nonpersistent_flags+=("--nodes=")
    flags+=("--settings=")
    two_word_flags+=("--settings")
    local_nonpersistent_flags+=("--settings")
    local_nonpersistent_flags+=("--settings=")
    flags+=("--trigger-config=")
    two_word_flags+=("--trigger-config")
    local_nonpersistent_flags+=("--trigger-config")
    local_nonpersistent_flags+=("--trigger-config=")
    flags+=("--trigger-type=")
    two_word_flags+=("--trigger-type")
    local_nonpersistent_flags+=("--trigger-type")
    local_nonpersistent_flags+=("--trigger-type=")
    flags+=("--viewport=")
    two_word_flags+=("--viewport")
    local_nonpersistent_flags+=("--viewport")
    local_nonpersistent_flags+=("--viewport=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_delete()
{
    last_command="openbeam_canvas_delete"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_execute()
{
    last_command="openbeam_canvas_execute"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--input=")
    two_word_flags+=("--input")
    local_nonpersistent_flags+=("--input")
    local_nonpersistent_flags+=("--input=")
    flags+=("--session-id=")
    two_word_flags+=("--session-id")
    local_nonpersistent_flags+=("--session-id")
    local_nonpersistent_flags+=("--session-id=")
    flags+=("--trigger-source=")
    two_word_flags+=("--trigger-source")
    local_nonpersistent_flags+=("--trigger-source")
    local_nonpersistent_flags+=("--trigger-source=")
    flags+=("--turn-id=")
    two_word_flags+=("--turn-id")
    local_nonpersistent_flags+=("--turn-id")
    local_nonpersistent_flags+=("--turn-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_executions()
{
    last_command="openbeam_canvas_executions"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--status=")
    two_word_flags+=("--status")
    local_nonpersistent_flags+=("--status")
    local_nonpersistent_flags+=("--status=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_get()
{
    last_command="openbeam_canvas_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_list()
{
    last_command="openbeam_canvas_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--status=")
    two_word_flags+=("--status")
    local_nonpersistent_flags+=("--status")
    local_nonpersistent_flags+=("--status=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_publish()
{
    last_command="openbeam_canvas_publish"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--changelog=")
    two_word_flags+=("--changelog")
    local_nonpersistent_flags+=("--changelog")
    local_nonpersistent_flags+=("--changelog=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas_update()
{
    last_command="openbeam_canvas_update"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--description=")
    two_word_flags+=("--description")
    local_nonpersistent_flags+=("--description")
    local_nonpersistent_flags+=("--description=")
    flags+=("--edges=")
    two_word_flags+=("--edges")
    local_nonpersistent_flags+=("--edges")
    local_nonpersistent_flags+=("--edges=")
    flags+=("--icon=")
    two_word_flags+=("--icon")
    local_nonpersistent_flags+=("--icon")
    local_nonpersistent_flags+=("--icon=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--nodes=")
    two_word_flags+=("--nodes")
    local_nonpersistent_flags+=("--nodes")
    local_nonpersistent_flags+=("--nodes=")
    flags+=("--settings=")
    two_word_flags+=("--settings")
    local_nonpersistent_flags+=("--settings")
    local_nonpersistent_flags+=("--settings=")
    flags+=("--trigger-config=")
    two_word_flags+=("--trigger-config")
    local_nonpersistent_flags+=("--trigger-config")
    local_nonpersistent_flags+=("--trigger-config=")
    flags+=("--trigger-type=")
    two_word_flags+=("--trigger-type")
    local_nonpersistent_flags+=("--trigger-type")
    local_nonpersistent_flags+=("--trigger-type=")
    flags+=("--viewport=")
    two_word_flags+=("--viewport")
    local_nonpersistent_flags+=("--viewport")
    local_nonpersistent_flags+=("--viewport=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_canvas()
{
    last_command="openbeam_canvas"

    command_aliases=()

    commands=()
    commands+=("create")
    commands+=("delete")
    commands+=("execute")
    commands+=("executions")
    commands+=("get")
    commands+=("list")
    commands+=("publish")
    commands+=("update")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_completion()
{
    last_command="openbeam_completion"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--help")
    flags+=("-h")
    local_nonpersistent_flags+=("--help")
    local_nonpersistent_flags+=("-h")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    must_have_one_noun+=("bash")
    must_have_one_noun+=("fish")
    must_have_one_noun+=("powershell")
    must_have_one_noun+=("zsh")
    noun_aliases=()
}

_openbeam_config_profiles()
{
    last_command="openbeam_config_profiles"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_config_set()
{
    last_command="openbeam_config_set"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    local_nonpersistent_flags+=("--color")
    local_nonpersistent_flags+=("--color=")
    flags+=("--host=")
    two_word_flags+=("--host")
    local_nonpersistent_flags+=("--host")
    local_nonpersistent_flags+=("--host=")
    flags+=("--output=")
    two_word_flags+=("--output")
    local_nonpersistent_flags+=("--output")
    local_nonpersistent_flags+=("--output=")
    flags+=("--team=")
    two_word_flags+=("--team")
    local_nonpersistent_flags+=("--team")
    local_nonpersistent_flags+=("--team=")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    local_nonpersistent_flags+=("--timeout")
    local_nonpersistent_flags+=("--timeout=")
    flags+=("--debug")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_config_show()
{
    last_command="openbeam_config_show"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_config_use()
{
    last_command="openbeam_config_use"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_config()
{
    last_command="openbeam_config"

    command_aliases=()

    commands=()
    commands+=("profiles")
    commands+=("set")
    commands+=("show")
    commands+=("use")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_connect()
{
    last_command="openbeam_connectors_connect"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--app-id=")
    two_word_flags+=("--app-id")
    local_nonpersistent_flags+=("--app-id")
    local_nonpersistent_flags+=("--app-id=")
    flags+=("--auth-type=")
    two_word_flags+=("--auth-type")
    local_nonpersistent_flags+=("--auth-type")
    local_nonpersistent_flags+=("--auth-type=")
    flags+=("--config=")
    two_word_flags+=("--config")
    local_nonpersistent_flags+=("--config")
    local_nonpersistent_flags+=("--config=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--type=")
    two_word_flags+=("--type")
    local_nonpersistent_flags+=("--type")
    local_nonpersistent_flags+=("--type=")
    flags+=("--workspace-external-id=")
    two_word_flags+=("--workspace-external-id")
    local_nonpersistent_flags+=("--workspace-external-id")
    local_nonpersistent_flags+=("--workspace-external-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--app-id=")
    must_have_one_flag+=("--name=")
    must_have_one_flag+=("--workspace-external-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_disconnect()
{
    last_command="openbeam_connectors_disconnect"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_get()
{
    last_command="openbeam_connectors_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_history()
{
    last_command="openbeam_connectors_history"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_list()
{
    last_command="openbeam_connectors_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_pause()
{
    last_command="openbeam_connectors_pause"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_resource-sync()
{
    last_command="openbeam_connectors_resource-sync"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--enabled")
    local_nonpersistent_flags+=("--enabled")
    flags+=("--resource-id=")
    two_word_flags+=("--resource-id")
    local_nonpersistent_flags+=("--resource-id")
    local_nonpersistent_flags+=("--resource-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--resource-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_resources()
{
    last_command="openbeam_connectors_resources"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--cursor=")
    two_word_flags+=("--cursor")
    local_nonpersistent_flags+=("--cursor")
    local_nonpersistent_flags+=("--cursor=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--search=")
    two_word_flags+=("--search")
    local_nonpersistent_flags+=("--search")
    local_nonpersistent_flags+=("--search=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_resume()
{
    last_command="openbeam_connectors_resume"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_status()
{
    last_command="openbeam_connectors_status"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_sync()
{
    last_command="openbeam_connectors_sync"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--type=")
    two_word_flags+=("--type")
    local_nonpersistent_flags+=("--type")
    local_nonpersistent_flags+=("--type=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors_update()
{
    last_command="openbeam_connectors_update"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--config=")
    two_word_flags+=("--config")
    local_nonpersistent_flags+=("--config")
    local_nonpersistent_flags+=("--config=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_connectors()
{
    last_command="openbeam_connectors"

    command_aliases=()

    commands=()
    commands+=("connect")
    commands+=("disconnect")
    commands+=("get")
    commands+=("history")
    commands+=("list")
    commands+=("pause")
    commands+=("resource-sync")
    commands+=("resources")
    commands+=("resume")
    commands+=("status")
    commands+=("sync")
    commands+=("update")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_help()
{
    last_command="openbeam_help"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    has_completion_function=1
    noun_aliases=()
}

_openbeam_integrations_oauth-callback()
{
    last_command="openbeam_integrations_oauth-callback"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--code=")
    two_word_flags+=("--code")
    local_nonpersistent_flags+=("--code")
    local_nonpersistent_flags+=("--code=")
    flags+=("--integration=")
    two_word_flags+=("--integration")
    local_nonpersistent_flags+=("--integration")
    local_nonpersistent_flags+=("--integration=")
    flags+=("--state=")
    two_word_flags+=("--state")
    local_nonpersistent_flags+=("--state")
    local_nonpersistent_flags+=("--state=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--code=")
    must_have_one_flag+=("--integration=")
    must_have_one_flag+=("--state=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_integrations_oauth-start()
{
    last_command="openbeam_integrations_oauth-start"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--integration=")
    two_word_flags+=("--integration")
    local_nonpersistent_flags+=("--integration")
    local_nonpersistent_flags+=("--integration=")
    flags+=("--redirect-url=")
    two_word_flags+=("--redirect-url")
    local_nonpersistent_flags+=("--redirect-url")
    local_nonpersistent_flags+=("--redirect-url=")
    flags+=("--workspace-id=")
    two_word_flags+=("--workspace-id")
    local_nonpersistent_flags+=("--workspace-id")
    local_nonpersistent_flags+=("--workspace-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--connector-id=")
    must_have_one_flag+=("--integration=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_integrations_service-account-auth()
{
    last_command="openbeam_integrations_service-account-auth"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--credentials=")
    two_word_flags+=("--credentials")
    local_nonpersistent_flags+=("--credentials")
    local_nonpersistent_flags+=("--credentials=")
    flags+=("--delegated-email=")
    two_word_flags+=("--delegated-email")
    local_nonpersistent_flags+=("--delegated-email")
    local_nonpersistent_flags+=("--delegated-email=")
    flags+=("--integration=")
    two_word_flags+=("--integration")
    local_nonpersistent_flags+=("--integration")
    local_nonpersistent_flags+=("--integration=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--connector-id=")
    must_have_one_flag+=("--integration=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_integrations()
{
    last_command="openbeam_integrations"

    command_aliases=()

    commands=()
    commands+=("oauth-callback")
    commands+=("oauth-start")
    commands+=("service-account-auth")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_expertise()
{
    last_command="openbeam_knowledge_expertise"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--person-id=")
    two_word_flags+=("--person-id")
    local_nonpersistent_flags+=("--person-id")
    local_nonpersistent_flags+=("--person-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--person-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_experts()
{
    last_command="openbeam_knowledge_experts"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--topic-id=")
    two_word_flags+=("--topic-id")
    local_nonpersistent_flags+=("--topic-id")
    local_nonpersistent_flags+=("--topic-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--topic-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_get()
{
    last_command="openbeam_knowledge_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_list()
{
    last_command="openbeam_knowledge_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--cursor=")
    two_word_flags+=("--cursor")
    local_nonpersistent_flags+=("--cursor")
    local_nonpersistent_flags+=("--cursor=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--type=")
    two_word_flags+=("--type")
    local_nonpersistent_flags+=("--type")
    local_nonpersistent_flags+=("--type=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_panel()
{
    last_command="openbeam_knowledge_panel"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_relations()
{
    last_command="openbeam_knowledge_relations"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--direction=")
    two_word_flags+=("--direction")
    local_nonpersistent_flags+=("--direction")
    local_nonpersistent_flags+=("--direction=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge_search()
{
    last_command="openbeam_knowledge_search"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--type=")
    two_word_flags+=("--type")
    local_nonpersistent_flags+=("--type")
    local_nonpersistent_flags+=("--type=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--query=")
    must_have_one_flag+=("-q")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_knowledge()
{
    last_command="openbeam_knowledge"

    command_aliases=()

    commands=()
    commands+=("expertise")
    commands+=("experts")
    commands+=("get")
    commands+=("list")
    commands+=("panel")
    commands+=("relations")
    commands+=("search")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_prompts_get()
{
    last_command="openbeam_mcp_prompts_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--args=")
    two_word_flags+=("--args")
    local_nonpersistent_flags+=("--args")
    local_nonpersistent_flags+=("--args=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_prompts_list()
{
    last_command="openbeam_mcp_prompts_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_prompts()
{
    last_command="openbeam_mcp_prompts"

    command_aliases=()

    commands=()
    commands+=("get")
    commands+=("list")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_resources_list()
{
    last_command="openbeam_mcp_resources_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_resources_read()
{
    last_command="openbeam_mcp_resources_read"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--uri=")
    two_word_flags+=("--uri")
    local_nonpersistent_flags+=("--uri")
    local_nonpersistent_flags+=("--uri=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--uri=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_resources()
{
    last_command="openbeam_mcp_resources"

    command_aliases=()

    commands=()
    commands+=("list")
    commands+=("read")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_serve()
{
    last_command="openbeam_mcp_serve"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_tools_call()
{
    last_command="openbeam_mcp_tools_call"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--args=")
    two_word_flags+=("--args")
    local_nonpersistent_flags+=("--args")
    local_nonpersistent_flags+=("--args=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_tools_list()
{
    last_command="openbeam_mcp_tools_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp_tools()
{
    last_command="openbeam_mcp_tools"

    command_aliases=()

    commands=()
    commands+=("call")
    commands+=("list")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mcp()
{
    last_command="openbeam_mcp"

    command_aliases=()

    commands=()
    commands+=("prompts")
    commands+=("resources")
    commands+=("serve")
    commands+=("tools")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_ask()
{
    last_command="openbeam_media_ask"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--media-id=")
    two_word_flags+=("--media-id")
    local_nonpersistent_flags+=("--media-id")
    local_nonpersistent_flags+=("--media-id=")
    flags+=("--question=")
    two_word_flags+=("--question")
    local_nonpersistent_flags+=("--question")
    local_nonpersistent_flags+=("--question=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--media-id=")
    must_have_one_flag+=("--question=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_chapters()
{
    last_command="openbeam_media_chapters"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--force-refresh")
    local_nonpersistent_flags+=("--force-refresh")
    flags+=("--vespa-id=")
    two_word_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--vespa-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_highlights()
{
    last_command="openbeam_media_highlights"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--force-refresh")
    local_nonpersistent_flags+=("--force-refresh")
    flags+=("--vespa-id=")
    two_word_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--vespa-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_metadata()
{
    last_command="openbeam_media_metadata"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--vespa-id=")
    two_word_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--vespa-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_regenerate()
{
    last_command="openbeam_media_regenerate"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--content-type=")
    two_word_flags+=("--content-type")
    local_nonpersistent_flags+=("--content-type")
    local_nonpersistent_flags+=("--content-type=")
    flags+=("--vespa-id=")
    two_word_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--content-type=")
    must_have_one_flag+=("--vespa-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_summary()
{
    last_command="openbeam_media_summary"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--force-refresh")
    local_nonpersistent_flags+=("--force-refresh")
    flags+=("--vespa-id=")
    two_word_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--vespa-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media_transcript()
{
    last_command="openbeam_media_transcript"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--force-refresh")
    local_nonpersistent_flags+=("--force-refresh")
    flags+=("--vespa-id=")
    two_word_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id")
    local_nonpersistent_flags+=("--vespa-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--vespa-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_media()
{
    last_command="openbeam_media"

    command_aliases=()

    commands=()
    commands+=("ask")
    commands+=("chapters")
    commands+=("highlights")
    commands+=("metadata")
    commands+=("regenerate")
    commands+=("summary")
    commands+=("transcript")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_broadcast()
{
    last_command="openbeam_mission_broadcast"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--content=")
    two_word_flags+=("--content")
    local_nonpersistent_flags+=("--content")
    local_nonpersistent_flags+=("--content=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--content=")
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_cancel()
{
    last_command="openbeam_mission_cancel"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_create()
{
    last_command="openbeam_mission_create"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--budget-cents=")
    two_word_flags+=("--budget-cents")
    local_nonpersistent_flags+=("--budget-cents")
    local_nonpersistent_flags+=("--budget-cents=")
    flags+=("--cron-schedule=")
    two_word_flags+=("--cron-schedule")
    local_nonpersistent_flags+=("--cron-schedule")
    local_nonpersistent_flags+=("--cron-schedule=")
    flags+=("--heartbeat-interval-min=")
    two_word_flags+=("--heartbeat-interval-min")
    local_nonpersistent_flags+=("--heartbeat-interval-min")
    local_nonpersistent_flags+=("--heartbeat-interval-min=")
    flags+=("--max-concurrent-runs=")
    two_word_flags+=("--max-concurrent-runs")
    local_nonpersistent_flags+=("--max-concurrent-runs")
    local_nonpersistent_flags+=("--max-concurrent-runs=")
    flags+=("--objective=")
    two_word_flags+=("--objective")
    local_nonpersistent_flags+=("--objective")
    local_nonpersistent_flags+=("--objective=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--objective=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_get()
{
    last_command="openbeam_mission_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_list()
{
    last_command="openbeam_mission_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--status=")
    two_word_flags+=("--status")
    local_nonpersistent_flags+=("--status")
    local_nonpersistent_flags+=("--status=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_pause()
{
    last_command="openbeam_mission_pause"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_resume()
{
    last_command="openbeam_mission_resume"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_spawn-agent()
{
    last_command="openbeam_mission_spawn-agent"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--role=")
    two_word_flags+=("--role")
    local_nonpersistent_flags+=("--role")
    local_nonpersistent_flags+=("--role=")
    flags+=("--task-id=")
    two_word_flags+=("--task-id")
    local_nonpersistent_flags+=("--task-id")
    local_nonpersistent_flags+=("--task-id=")
    flags+=("--tool=")
    two_word_flags+=("--tool")
    local_nonpersistent_flags+=("--tool")
    local_nonpersistent_flags+=("--tool=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_flag+=("--name=")
    must_have_one_flag+=("--role=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_start()
{
    last_command="openbeam_mission_start"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission_update()
{
    last_command="openbeam_mission_update"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--budget-cents=")
    two_word_flags+=("--budget-cents")
    local_nonpersistent_flags+=("--budget-cents")
    local_nonpersistent_flags+=("--budget-cents=")
    flags+=("--heartbeat-interval-min=")
    two_word_flags+=("--heartbeat-interval-min")
    local_nonpersistent_flags+=("--heartbeat-interval-min")
    local_nonpersistent_flags+=("--heartbeat-interval-min=")
    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--max-concurrent-runs=")
    two_word_flags+=("--max-concurrent-runs")
    local_nonpersistent_flags+=("--max-concurrent-runs")
    local_nonpersistent_flags+=("--max-concurrent-runs=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--objective=")
    two_word_flags+=("--objective")
    local_nonpersistent_flags+=("--objective")
    local_nonpersistent_flags+=("--objective=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_mission()
{
    last_command="openbeam_mission"

    command_aliases=()

    commands=()
    commands+=("broadcast")
    commands+=("cancel")
    commands+=("create")
    commands+=("get")
    commands+=("list")
    commands+=("pause")
    commands+=("resume")
    commands+=("spawn-agent")
    commands+=("start")
    commands+=("update")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_document()
{
    last_command="openbeam_permissions_document"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--document-id=")
    two_word_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--document-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_groups()
{
    last_command="openbeam_permissions_groups"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--user-id=")
    two_word_flags+=("--user-id")
    local_nonpersistent_flags+=("--user-id")
    local_nonpersistent_flags+=("--user-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_invalidate()
{
    last_command="openbeam_permissions_invalidate"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--scope=")
    two_word_flags+=("--scope")
    local_nonpersistent_flags+=("--scope")
    local_nonpersistent_flags+=("--scope=")
    flags+=("--user-id=")
    two_word_flags+=("--user-id")
    local_nonpersistent_flags+=("--user-id")
    local_nonpersistent_flags+=("--user-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_me()
{
    last_command="openbeam_permissions_me"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_scopes()
{
    last_command="openbeam_permissions_scopes"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--user-id=")
    two_word_flags+=("--user-id")
    local_nonpersistent_flags+=("--user-id")
    local_nonpersistent_flags+=("--user-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_stats()
{
    last_command="openbeam_permissions_stats"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_sync-status()
{
    last_command="openbeam_permissions_sync-status"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--connector-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions_sync-statuses()
{
    last_command="openbeam_permissions_sync-statuses"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_permissions()
{
    last_command="openbeam_permissions"

    command_aliases=()

    commands=()
    commands+=("document")
    commands+=("groups")
    commands+=("invalidate")
    commands+=("me")
    commands+=("scopes")
    commands+=("stats")
    commands+=("sync-status")
    commands+=("sync-statuses")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_plugin_install()
{
    last_command="openbeam_plugin_install"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--dir=")
    two_word_flags+=("--dir")
    local_nonpersistent_flags+=("--dir")
    local_nonpersistent_flags+=("--dir=")
    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--source=")
    two_word_flags+=("--source")
    local_nonpersistent_flags+=("--source")
    local_nonpersistent_flags+=("--source=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_flag+=("--source=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_plugin_list()
{
    last_command="openbeam_plugin_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--search-dir=")
    two_word_flags+=("--search-dir")
    local_nonpersistent_flags+=("--search-dir")
    local_nonpersistent_flags+=("--search-dir=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_plugin_run()
{
    last_command="openbeam_plugin_run"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--search-dir=")
    two_word_flags+=("--search-dir")
    local_nonpersistent_flags+=("--search-dir")
    local_nonpersistent_flags+=("--search-dir=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_plugin()
{
    last_command="openbeam_plugin"

    command_aliases=()

    commands=()
    commands+=("install")
    commands+=("list")
    commands+=("run")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_ask()
{
    last_command="openbeam_rag_ask"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--conversation-id=")
    two_word_flags+=("--conversation-id")
    local_nonpersistent_flags+=("--conversation-id")
    local_nonpersistent_flags+=("--conversation-id=")
    flags+=("--include-media")
    local_nonpersistent_flags+=("--include-media")
    flags+=("--model-id=")
    two_word_flags+=("--model-id")
    local_nonpersistent_flags+=("--model-id")
    local_nonpersistent_flags+=("--model-id=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--source-id=")
    two_word_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id=")
    flags+=("--temperature=")
    two_word_flags+=("--temperature")
    local_nonpersistent_flags+=("--temperature")
    local_nonpersistent_flags+=("--temperature=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--query=")
    must_have_one_flag+=("-q")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_conversations_create()
{
    last_command="openbeam_rag_conversations_create"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_conversations_delete()
{
    last_command="openbeam_rag_conversations_delete"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_conversations_get()
{
    last_command="openbeam_rag_conversations_get"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_conversations_list()
{
    last_command="openbeam_rag_conversations_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--status=")
    two_word_flags+=("--status")
    local_nonpersistent_flags+=("--status")
    local_nonpersistent_flags+=("--status=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_conversations()
{
    last_command="openbeam_rag_conversations"

    command_aliases=()

    commands=()
    commands+=("create")
    commands+=("delete")
    commands+=("get")
    commands+=("list")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag_stream()
{
    last_command="openbeam_rag_stream"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--conversation-id=")
    two_word_flags+=("--conversation-id")
    local_nonpersistent_flags+=("--conversation-id")
    local_nonpersistent_flags+=("--conversation-id=")
    flags+=("--include-media")
    local_nonpersistent_flags+=("--include-media")
    flags+=("--model-id=")
    two_word_flags+=("--model-id")
    local_nonpersistent_flags+=("--model-id")
    local_nonpersistent_flags+=("--model-id=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--source-id=")
    two_word_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id=")
    flags+=("--temperature=")
    two_word_flags+=("--temperature")
    local_nonpersistent_flags+=("--temperature")
    local_nonpersistent_flags+=("--temperature=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--query=")
    must_have_one_flag+=("-q")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_rag()
{
    last_command="openbeam_rag"

    command_aliases=()

    commands=()
    commands+=("ask")
    commands+=("conversations")
    commands+=("stream")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_research_artifacts()
{
    last_command="openbeam_research_artifacts"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--workflow-id=")
    two_word_flags+=("--workflow-id")
    local_nonpersistent_flags+=("--workflow-id")
    local_nonpersistent_flags+=("--workflow-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--workflow-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_research_cancel()
{
    last_command="openbeam_research_cancel"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--workflow-id=")
    two_word_flags+=("--workflow-id")
    local_nonpersistent_flags+=("--workflow-id")
    local_nonpersistent_flags+=("--workflow-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--workflow-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_research_progress()
{
    last_command="openbeam_research_progress"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--workflow-id=")
    two_word_flags+=("--workflow-id")
    local_nonpersistent_flags+=("--workflow-id")
    local_nonpersistent_flags+=("--workflow-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--workflow-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_research_start()
{
    last_command="openbeam_research_start"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--max-steps=")
    two_word_flags+=("--max-steps")
    local_nonpersistent_flags+=("--max-steps")
    local_nonpersistent_flags+=("--max-steps=")
    flags+=("--prompt=")
    two_word_flags+=("--prompt")
    local_nonpersistent_flags+=("--prompt")
    local_nonpersistent_flags+=("--prompt=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--prompt=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_research()
{
    last_command="openbeam_research"

    command_aliases=()

    commands=()
    commands+=("artifacts")
    commands+=("cancel")
    commands+=("progress")
    commands+=("start")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_author()
{
    last_command="openbeam_search_author"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--author-id=")
    two_word_flags+=("--author-id")
    local_nonpersistent_flags+=("--author-id")
    local_nonpersistent_flags+=("--author-id=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--author-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_hybrid()
{
    last_command="openbeam_search_hybrid"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-type=")
    two_word_flags+=("--connector-type")
    local_nonpersistent_flags+=("--connector-type")
    local_nonpersistent_flags+=("--connector-type=")
    flags+=("--document-type=")
    two_word_flags+=("--document-type")
    local_nonpersistent_flags+=("--document-type")
    local_nonpersistent_flags+=("--document-type=")
    flags+=("--from-date=")
    two_word_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--mode=")
    two_word_flags+=("--mode")
    local_nonpersistent_flags+=("--mode")
    local_nonpersistent_flags+=("--mode=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--rrf-k=")
    two_word_flags+=("--rrf-k")
    local_nonpersistent_flags+=("--rrf-k")
    local_nonpersistent_flags+=("--rrf-k=")
    flags+=("--source-id=")
    two_word_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id=")
    flags+=("--to-date=")
    two_word_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date=")
    flags+=("--weight-bm25=")
    two_word_flags+=("--weight-bm25")
    local_nonpersistent_flags+=("--weight-bm25")
    local_nonpersistent_flags+=("--weight-bm25=")
    flags+=("--weight-dense=")
    two_word_flags+=("--weight-dense")
    local_nonpersistent_flags+=("--weight-dense")
    local_nonpersistent_flags+=("--weight-dense=")
    flags+=("--weight-sparse=")
    two_word_flags+=("--weight-sparse")
    local_nonpersistent_flags+=("--weight-sparse")
    local_nonpersistent_flags+=("--weight-sparse=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_media()
{
    last_command="openbeam_search_media"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--from-date=")
    two_word_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--media-type=")
    two_word_flags+=("--media-type")
    local_nonpersistent_flags+=("--media-type")
    local_nonpersistent_flags+=("--media-type=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--ranking=")
    two_word_flags+=("--ranking")
    local_nonpersistent_flags+=("--ranking")
    local_nonpersistent_flags+=("--ranking=")
    flags+=("--source-id=")
    two_word_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id=")
    flags+=("--to-date=")
    two_word_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_query()
{
    last_command="openbeam_search_query"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--author-id=")
    two_word_flags+=("--author-id")
    local_nonpersistent_flags+=("--author-id")
    local_nonpersistent_flags+=("--author-id=")
    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--connector-type=")
    two_word_flags+=("--connector-type")
    local_nonpersistent_flags+=("--connector-type")
    local_nonpersistent_flags+=("--connector-type=")
    flags+=("--document-type=")
    two_word_flags+=("--document-type")
    local_nonpersistent_flags+=("--document-type")
    local_nonpersistent_flags+=("--document-type=")
    flags+=("--from-date=")
    two_word_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date=")
    flags+=("--label=")
    two_word_flags+=("--label")
    local_nonpersistent_flags+=("--label")
    local_nonpersistent_flags+=("--label=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--priority=")
    two_word_flags+=("--priority")
    local_nonpersistent_flags+=("--priority")
    local_nonpersistent_flags+=("--priority=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--ranking=")
    two_word_flags+=("--ranking")
    local_nonpersistent_flags+=("--ranking")
    local_nonpersistent_flags+=("--ranking=")
    flags+=("--source-id=")
    two_word_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id=")
    flags+=("--source-type=")
    two_word_flags+=("--source-type")
    local_nonpersistent_flags+=("--source-type")
    local_nonpersistent_flags+=("--source-type=")
    flags+=("--status=")
    two_word_flags+=("--status")
    local_nonpersistent_flags+=("--status")
    local_nonpersistent_flags+=("--status=")
    flags+=("--to-date=")
    two_word_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_recent()
{
    last_command="openbeam_search_recent"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--hours=")
    two_word_flags+=("--hours")
    local_nonpersistent_flags+=("--hours")
    local_nonpersistent_flags+=("--hours=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_similar()
{
    last_command="openbeam_search_similar"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--document-id=")
    two_word_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id")
    local_nonpersistent_flags+=("--document-id=")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--document-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_thread()
{
    last_command="openbeam_search_thread"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--thread-id=")
    two_word_flags+=("--thread-id")
    local_nonpersistent_flags+=("--thread-id")
    local_nonpersistent_flags+=("--thread-id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--thread-id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search_unified()
{
    last_command="openbeam_search_unified"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--connector-id=")
    two_word_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id")
    local_nonpersistent_flags+=("--connector-id=")
    flags+=("--connector-type=")
    two_word_flags+=("--connector-type")
    local_nonpersistent_flags+=("--connector-type")
    local_nonpersistent_flags+=("--connector-type=")
    flags+=("--document-type=")
    two_word_flags+=("--document-type")
    local_nonpersistent_flags+=("--document-type")
    local_nonpersistent_flags+=("--document-type=")
    flags+=("--from-date=")
    two_word_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date")
    local_nonpersistent_flags+=("--from-date=")
    flags+=("--include-documents")
    local_nonpersistent_flags+=("--include-documents")
    flags+=("--include-media")
    local_nonpersistent_flags+=("--include-media")
    flags+=("--limit=")
    two_word_flags+=("--limit")
    local_nonpersistent_flags+=("--limit")
    local_nonpersistent_flags+=("--limit=")
    flags+=("--media-ranking=")
    two_word_flags+=("--media-ranking")
    local_nonpersistent_flags+=("--media-ranking")
    local_nonpersistent_flags+=("--media-ranking=")
    flags+=("--offset=")
    two_word_flags+=("--offset")
    local_nonpersistent_flags+=("--offset")
    local_nonpersistent_flags+=("--offset=")
    flags+=("--query=")
    two_word_flags+=("--query")
    two_word_flags+=("-q")
    local_nonpersistent_flags+=("--query")
    local_nonpersistent_flags+=("--query=")
    local_nonpersistent_flags+=("-q")
    flags+=("--ranking=")
    two_word_flags+=("--ranking")
    local_nonpersistent_flags+=("--ranking")
    local_nonpersistent_flags+=("--ranking=")
    flags+=("--source-id=")
    two_word_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id")
    local_nonpersistent_flags+=("--source-id=")
    flags+=("--to-date=")
    two_word_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date")
    local_nonpersistent_flags+=("--to-date=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_search()
{
    last_command="openbeam_search"

    command_aliases=()

    commands=()
    commands+=("author")
    commands+=("hybrid")
    commands+=("media")
    commands+=("query")
    commands+=("recent")
    commands+=("similar")
    commands+=("thread")
    commands+=("unified")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_teams_create()
{
    last_command="openbeam_teams_create"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--name=")
    two_word_flags+=("--name")
    local_nonpersistent_flags+=("--name")
    local_nonpersistent_flags+=("--name=")
    flags+=("--slug=")
    two_word_flags+=("--slug")
    local_nonpersistent_flags+=("--slug")
    local_nonpersistent_flags+=("--slug=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--name=")
    must_have_one_flag+=("--slug=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_teams_list()
{
    last_command="openbeam_teams_list"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_teams_role()
{
    last_command="openbeam_teams_role"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_teams_switch()
{
    last_command="openbeam_teams_switch"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--id=")
    two_word_flags+=("--id")
    local_nonpersistent_flags+=("--id")
    local_nonpersistent_flags+=("--id=")
    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_flag+=("--id=")
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_teams()
{
    last_command="openbeam_teams"

    command_aliases=()

    commands=()
    commands+=("create")
    commands+=("list")
    commands+=("role")
    commands+=("switch")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_version()
{
    last_command="openbeam_version"

    command_aliases=()

    commands=()

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

_openbeam_root_command()
{
    last_command="openbeam"

    command_aliases=()

    commands=()
    commands+=("agent")
    commands+=("analytics")
    commands+=("auth")
    commands+=("background-agents")
    commands+=("canvas")
    commands+=("completion")
    commands+=("config")
    commands+=("connectors")
    commands+=("help")
    commands+=("integrations")
    commands+=("knowledge")
    commands+=("mcp")
    commands+=("media")
    commands+=("mission")
    commands+=("permissions")
    commands+=("plugin")
    commands+=("rag")
    commands+=("research")
    commands+=("search")
    commands+=("teams")
    commands+=("version")

    flags=()
    two_word_flags=()
    local_nonpersistent_flags=()
    flags_with_completion=()
    flags_completion=()

    flags+=("--color=")
    two_word_flags+=("--color")
    flags+=("--debug")
    flags+=("--host=")
    two_word_flags+=("--host")
    flags+=("--jq=")
    two_word_flags+=("--jq")
    flags+=("--no-color")
    flags+=("--non-interactive")
    flags+=("--output=")
    two_word_flags+=("--output")
    flags+=("--profile=")
    two_word_flags+=("--profile")
    flags+=("--raw")
    flags+=("--team=")
    two_word_flags+=("--team")
    flags+=("--template=")
    two_word_flags+=("--template")
    flags+=("--timeout=")
    two_word_flags+=("--timeout")
    flags+=("--trace")
    flags+=("--yes")
    flags+=("-y")

    must_have_one_flag=()
    must_have_one_noun=()
    noun_aliases=()
}

__start_openbeam()
{
    local cur prev words cword split
    declare -A flaghash 2>/dev/null || :
    declare -A aliashash 2>/dev/null || :
    if declare -F _init_completion >/dev/null 2>&1; then
        _init_completion -s || return
    else
        __openbeam_init_completion -n "=" || return
    fi

    local c=0
    local flag_parsing_disabled=
    local flags=()
    local two_word_flags=()
    local local_nonpersistent_flags=()
    local flags_with_completion=()
    local flags_completion=()
    local commands=("openbeam")
    local command_aliases=()
    local must_have_one_flag=()
    local must_have_one_noun=()
    local has_completion_function=""
    local last_command=""
    local nouns=()
    local noun_aliases=()

    __openbeam_handle_word
}

if [[ $(type -t compopt) = "builtin" ]]; then
    complete -o default -F __start_openbeam openbeam
else
    complete -o default -o nospace -F __start_openbeam openbeam
fi

# ex: ts=4 sw=4 et filetype=sh
