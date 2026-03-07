import {
  BottomSheetBackdrop,
  type BottomSheetBackgroundProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type {
  AgentMode,
  AgentModelDefinition,
  AgentProvider,
} from "@server/server/agent/agent-sdk-types";
import type { AgentProviderDefinition } from "@server/server/agent/provider-manifest";
import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Shield,
  X,
} from "lucide-react-native";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StyleProp, TextProps, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { theme as defaultTheme } from "@/styles/theme";

type DropdownTriggerRenderProps = {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  errorMessage?: string | null;
  warningMessage?: string | null;
  helperText?: string | null;
};

type DropdownTriggerRenderer = (props: DropdownTriggerRenderProps) => ReactNode;

interface DropdownFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  errorMessage?: string | null;
  warningMessage?: string | null;
  helperText?: string | null;
  renderTrigger?: DropdownTriggerRenderer;
  testID?: string;
}

export function DropdownField({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  errorMessage,
  warningMessage,
  helperText,
  renderTrigger,
  testID,
}: DropdownFieldProps): ReactElement {
  if (renderTrigger) {
    return (
      <>
        {renderTrigger({
          label,
          value,
          placeholder,
          onPress,
          disabled,
          errorMessage,
          warningMessage,
          helperText,
        })}
      </>
    );
  }

  return (
    <View style={styles.formSection}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.dropdownControl,
          disabled && styles.dropdownControlDisabled,
        ]}
        testID={testID}
      >
        <Text
          numberOfLines={1}
          style={value ? styles.dropdownValue : styles.dropdownPlaceholder}
        >
          {value || placeholder}
        </Text>
        <ChevronDown
          color={defaultTheme.colors.foregroundMuted}
          size={defaultTheme.iconSize.md}
        />
      </Pressable>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      {warningMessage ? (
        <Text style={styles.warningText}>{warningMessage}</Text>
      ) : null}
      {!errorMessage && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  errorMessage?: string | null;
  warningMessage?: string | null;
  helperText?: string | null;
  controlRef?: React.RefObject<View | null>;
  valueEllipsizeMode?: "head" | "middle" | "tail" | "clip";
  testID?: string;
}

export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  errorMessage,
  warningMessage,
  helperText,
  controlRef,
  valueEllipsizeMode,
  testID,
}: SelectFieldProps): ReactElement {
  const getWebKey = useCallback((event: unknown): string | null => {
    if (!event || typeof event !== "object") {
      return null;
    }
    const eventWithNative = event as { nativeEvent?: unknown; key?: unknown };
    if (typeof eventWithNative.key === "string") {
      return eventWithNative.key;
    }
    const nativeEvent = eventWithNative.nativeEvent as
      | { key?: unknown }
      | undefined;
    return typeof nativeEvent?.key === "string" ? nativeEvent.key : null;
  }, []);

  const preventWebDefault = useCallback((event: unknown) => {
    if (!event || typeof event !== "object") {
      return;
    }
    const candidate = event as { preventDefault?: unknown };
    if (typeof candidate.preventDefault === "function") {
      candidate.preventDefault();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: unknown) => {
      if (Platform.OS !== "web") {
        return;
      }
      const key = getWebKey(event);
      if (key === "Enter" || key === " ") {
        preventWebDefault(event);
        onPress();
      }
    },
    [getWebKey, onPress, preventWebDefault]
  );

  const normalizedValue = (value ?? "").trim();
  const normalizedPlaceholder = (placeholder ?? "").trim();
  const hasConcreteValue =
    normalizedValue.length > 0 &&
    (normalizedPlaceholder.length === 0 ||
      normalizedValue !== normalizedPlaceholder);
  const _displayText = hasConcreteValue
    ? normalizedValue
    : normalizedPlaceholder || "Select...";
  const webPressableProps =
    Platform.OS === "web"
      ? ({
          onKeyDown: handleKeyDown,
          tabIndex: 0,
        } as const)
      : {};

  return (
    <View style={styles.selectFieldContainer}>
      <Pressable
        {...webPressableProps}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        ref={controlRef}
        style={[
          styles.selectFieldControl,
          disabled && styles.selectFieldControlDisabled,
        ]}
        testID={testID}
      >
        <View style={styles.selectFieldContent}>
          <Text style={styles.selectFieldLabel}>{label}</Text>
          <Text
            ellipsizeMode={valueEllipsizeMode ?? "tail"}
            numberOfLines={1}
            style={
              value ? styles.selectFieldValue : styles.selectFieldPlaceholder
            }
          >
            {value || placeholder || "Select..."}
          </Text>
        </View>
        <ChevronRight
          color={defaultTheme.colors.foregroundMuted}
          size={defaultTheme.iconSize.lg}
        />
      </Pressable>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      {warningMessage ? (
        <Text style={styles.warningText}>{warningMessage}</Text>
      ) : null}
      {!(errorMessage || warningMessage) && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

interface DropdownSheetProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

function DropdownSheetBackground({ style }: BottomSheetBackgroundProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[style, styles.bottomSheetBackground]}
    />
  );
}

export function DropdownSheet({
  title,
  visible,
  onClose,
  children,
}: DropdownSheetProps): ReactElement {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%", "90%"], []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      backdropComponent={renderBackdrop}
      backgroundComponent={DropdownSheetBackground}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.bottomSheetHandle}
      index={0}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      onChange={handleSheetChange}
      ref={bottomSheetRef}
      snapPoints={snapPoints}
    >
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.dropdownSheetTitle}>{title}</Text>
        <Pressable
          accessibilityLabel="Close sheet"
          accessibilityRole="button"
          hitSlop={10}
          onPress={handleClose}
          testID="dropdown-sheet-close"
        >
          <X
            color={defaultTheme.colors.foregroundMuted}
            size={defaultTheme.iconSize.md}
          />
        </Pressable>
      </View>
      <BottomSheetScrollView
        contentContainerStyle={styles.dropdownSheetScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// Re-export ComboboxItem as SelectOption for backwards compatibility
const SelectOption = ComboboxItem;

interface ComboSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface ComboSelectProps {
  label: string;
  title: string;
  value: string;
  options: ComboSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  isLoading?: boolean;
  onSelect: (id: string) => void;
  icon?: ReactElement;
  showLabel?: boolean;
}

export function ComboSelect({
  label,
  title,
  value,
  options,
  placeholder,
  disabled,
  allowCustomValue = false,
  isLoading,
  onSelect,
  icon,
  showLabel = true,
}: ComboSelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = selectedOption?.label ?? "";
  const isEmpty = options.length === 0;

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleOpenChange = useCallback((open: boolean) => setIsOpen(open), []);

  return (
    <>
      <FormSelectTrigger
        controlRef={anchorRef}
        disabled={disabled || isEmpty}
        icon={icon}
        isLoading={isLoading}
        label={label}
        onPress={handleOpen}
        placeholder={placeholder}
        showLabel={showLabel}
        value={displayValue}
      />
      <Combobox
        allowCustomValue={allowCustomValue}
        anchorRef={anchorRef}
        onOpenChange={handleOpenChange}
        onSelect={onSelect}
        open={isOpen}
        options={options}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        title={title}
        value={value}
      />
    </>
  );
}

interface CompactSelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  controlRef?: React.RefObject<View | null>;
  icon?: ReactElement;
  showLabel?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  valueEllipsizeMode?: TextProps["ellipsizeMode"];
  testID?: string;
}

export function FormSelectTrigger({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  isLoading,
  controlRef,
  icon,
  showLabel = true,
  containerStyle,
  valueEllipsizeMode,
  testID,
}: CompactSelectFieldProps): ReactElement {
  const getWebKey = useCallback((event: unknown): string | null => {
    if (!event || typeof event !== "object") {
      return null;
    }
    const eventWithNative = event as { nativeEvent?: unknown; key?: unknown };
    if (typeof eventWithNative.key === "string") {
      return eventWithNative.key;
    }
    const nativeEvent = eventWithNative.nativeEvent as
      | { key?: unknown }
      | undefined;
    return typeof nativeEvent?.key === "string" ? nativeEvent.key : null;
  }, []);

  const preventWebDefault = useCallback((event: unknown) => {
    if (!event || typeof event !== "object") {
      return;
    }
    const candidate = event as { preventDefault?: unknown };
    if (typeof candidate.preventDefault === "function") {
      candidate.preventDefault();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: unknown) => {
      if (Platform.OS !== "web") {
        return;
      }
      const key = getWebKey(event);
      if (key === "Enter" || key === " ") {
        preventWebDefault(event);
        onPress();
      }
    },
    [getWebKey, onPress, preventWebDefault]
  );
  const normalizedValue = (value ?? "").trim();
  const normalizedPlaceholder = (placeholder ?? "").trim();
  const hasConcreteValue =
    normalizedValue.length > 0 &&
    (normalizedPlaceholder.length === 0 ||
      normalizedValue !== normalizedPlaceholder);
  const displayText = hasConcreteValue
    ? normalizedValue
    : normalizedPlaceholder || "Select...";
  const webPressableProps =
    Platform.OS === "web"
      ? ({
          onKeyDown: handleKeyDown,
          tabIndex: 0,
        } as const)
      : {};

  return (
    <Pressable
      {...webPressableProps}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      ref={controlRef}
      style={[
        styles.compactSelectControl,
        !showLabel && styles.compactSelectControlInline,
        containerStyle,
        disabled && styles.compactSelectControlDisabled,
      ]}
      testID={testID}
    >
      {icon ? <View style={styles.compactSelectLeading}>{icon}</View> : null}
      <View style={styles.compactSelectValueContainer}>
        {showLabel ? (
          <Text style={styles.compactSelectLabel}>{label}</Text>
        ) : null}
        {isLoading ? (
          <ActivityIndicator
            color={defaultTheme.colors.foregroundMuted}
            size="small"
          />
        ) : (
          <Text
            ellipsizeMode={valueEllipsizeMode}
            numberOfLines={1}
            style={
              hasConcreteValue
                ? styles.compactSelectValue
                : styles.compactSelectPlaceholder
            }
          >
            {displayText}
          </Text>
        )}
      </View>
      <ChevronDown
        color={defaultTheme.colors.foregroundMuted}
        size={defaultTheme.iconSize.md}
      />
    </Pressable>
  );
}

interface AgentConfigRowProps {
  providerDefinitions: AgentProviderDefinition[];
  selectedProvider: AgentProvider;
  onSelectProvider: (provider: AgentProvider) => void;
  modeOptions: AgentMode[];
  selectedMode: string;
  onSelectMode: (modeId: string) => void;
  models: AgentModelDefinition[];
  selectedModel: string;
  isModelLoading: boolean;
  onSelectModel: (modelId: string) => void;
  thinkingOptions: NonNullable<AgentModelDefinition["thinkingOptions"]>;
  selectedThinkingOptionId: string;
  onSelectThinkingOption: (thinkingOptionId: string) => void;
  disabled?: boolean;
}

export function AgentConfigRow({
  providerDefinitions,
  selectedProvider,
  onSelectProvider,
  modeOptions,
  selectedMode,
  onSelectMode,
  models,
  selectedModel,
  isModelLoading,
  onSelectModel,
  thinkingOptions,
  selectedThinkingOptionId,
  onSelectThinkingOption,
  disabled,
}: AgentConfigRowProps): ReactElement {
  const providerOptions: ComboSelectOption[] = useMemo(
    () =>
      providerDefinitions.map((def) => ({
        id: def.id,
        label: def.label,
      })),
    [providerDefinitions]
  );

  const modeSelectOptions: ComboSelectOption[] = useMemo(() => {
    if (modeOptions.length === 0) {
      return [{ id: "", label: "Default" }];
    }
    return modeOptions.map((mode) => ({
      id: mode.id,
      label: mode.label,
    }));
  }, [modeOptions]);

  const modelSelectOptions: ComboSelectOption[] = useMemo(() => {
    const opts: ComboSelectOption[] = [{ id: "", label: "Auto" }];
    for (const model of models) {
      opts.push({
        id: model.id,
        label: model.label,
      });
    }
    return opts;
  }, [models]);

  const thinkingSelectOptions: ComboSelectOption[] = useMemo(
    () =>
      thinkingOptions.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    [thinkingOptions]
  );

  const effectiveSelectedMode =
    selectedMode || (modeOptions.length > 0 ? modeOptions[0]?.id : "");
  const effectiveSelectedThinkingOption =
    selectedThinkingOptionId || thinkingSelectOptions[0]?.id || "";

  return (
    <View style={styles.agentConfigRow}>
      <View style={styles.agentConfigColumn}>
        <ComboSelect
          disabled={disabled || providerOptions.length === 0}
          icon={
            <Bot
              color={defaultTheme.colors.foregroundMuted}
              size={defaultTheme.iconSize.md}
            />
          }
          label="Provider"
          onSelect={onSelectProvider}
          options={providerOptions}
          placeholder={
            providerOptions.length > 0 ? "Select..." : "No providers available"
          }
          showLabel={false}
          title="Select provider"
          value={selectedProvider}
        />
      </View>
      <View style={styles.agentConfigColumn}>
        <ComboSelect
          disabled={disabled}
          icon={
            <Brain
              color={defaultTheme.colors.foregroundMuted}
              size={defaultTheme.iconSize.md}
            />
          }
          isLoading={isModelLoading}
          label="Model"
          onSelect={onSelectModel}
          options={modelSelectOptions}
          placeholder="Auto"
          showLabel={false}
          title="Select model"
          value={selectedModel}
        />
      </View>
      <View style={styles.agentConfigColumn}>
        <ComboSelect
          disabled={disabled || modeOptions.length === 0}
          icon={
            <Shield
              color={defaultTheme.colors.foregroundMuted}
              size={defaultTheme.iconSize.md}
            />
          }
          label="Mode"
          onSelect={onSelectMode}
          options={modeSelectOptions}
          placeholder="Default"
          showLabel={false}
          title="Select mode"
          value={effectiveSelectedMode}
        />
      </View>
      {thinkingSelectOptions.length > 0 ? (
        <View style={styles.agentConfigColumn}>
          <ComboSelect
            disabled={disabled}
            icon={
              <Brain
                color={defaultTheme.colors.foregroundMuted}
                size={defaultTheme.iconSize.md}
              />
            }
            label="Thinking"
            onSelect={onSelectThinkingOption}
            options={thinkingSelectOptions}
            placeholder="Select..."
            showLabel={false}
            title="Select thinking effort"
            value={effectiveSelectedThinkingOption}
          />
        </View>
      ) : null}
    </View>
  );
}

interface AssistantDropdownProps {
  providerDefinitions: AgentProviderDefinition[];
  selectedProvider: AgentProvider;
  disabled: boolean;
  onSelect: (provider: AgentProvider) => void;
}

export function AssistantDropdown({
  providerDefinitions,
  selectedProvider,
  disabled,
  onSelect,
}: AssistantDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const selectedDefinition = providerDefinitions.find(
    (definition) => definition.id === selectedProvider
  );

  const options = useMemo(
    () =>
      providerDefinitions.map((def) => ({
        id: def.id,
        label: def.label,
      })),
    [providerDefinitions]
  );

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleOpenChange = useCallback((open: boolean) => setIsOpen(open), []);

  return (
    <>
      <SelectField
        controlRef={anchorRef}
        disabled={disabled}
        label="AGENT"
        onPress={handleOpen}
        placeholder="Select assistant"
        value={selectedDefinition?.label ?? ""}
      />
      <Combobox
        anchorRef={anchorRef}
        onOpenChange={handleOpenChange}
        onSelect={(id) => onSelect(id as AgentProvider)}
        open={isOpen}
        options={options}
        title="Choose assistant"
        value={selectedProvider}
      />
    </>
  );
}

interface PermissionsDropdownProps {
  modeOptions: AgentMode[];
  selectedMode: string;
  disabled: boolean;
  onSelect: (modeId: string) => void;
}

export function PermissionsDropdown({
  modeOptions,
  selectedMode,
  disabled,
  onSelect,
}: PermissionsDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const hasOptions = modeOptions.length > 0;
  const selectedModeLabel = hasOptions
    ? (modeOptions.find((mode) => mode.id === selectedMode)?.label ??
      modeOptions[0]?.label ??
      "Default")
    : "Automatic";

  const options = useMemo(
    () =>
      modeOptions.map((mode) => ({
        id: mode.id,
        label: mode.label,
        description: mode.description,
      })),
    [modeOptions]
  );

  const handleOpen = useCallback(() => {
    if (hasOptions) {
      setIsOpen(true);
    }
  }, [hasOptions]);
  const handleOpenChange = useCallback((open: boolean) => setIsOpen(open), []);

  return (
    <>
      <SelectField
        controlRef={anchorRef}
        disabled={disabled || !hasOptions}
        helperText={
          hasOptions
            ? undefined
            : "This assistant does not expose selectable permissions."
        }
        label="PERMISSIONS"
        onPress={handleOpen}
        placeholder={hasOptions ? "Select permissions" : "Automatic"}
        value={selectedModeLabel}
      />
      {hasOptions ? (
        <Combobox
          anchorRef={anchorRef}
          onOpenChange={handleOpenChange}
          onSelect={onSelect}
          open={isOpen}
          options={options}
          title="Permissions"
          value={selectedMode}
        />
      ) : null}
    </>
  );
}

interface ModelDropdownProps {
  models: AgentModelDefinition[];
  selectedModel: string;
  isLoading: boolean;
  error: string | null;
  onSelect: (modelId: string) => void;
  onClear: () => void;
  onRefresh: () => void;
}

export function ModelDropdown({
  models,
  selectedModel,
  isLoading,
  error,
  onSelect,
  onClear,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
  onRefresh,
}: ModelDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const selectedLabel = selectedModel
    ? (models.find((model) => model.id === selectedModel)?.label ??
      selectedModel)
    : "Automatic";
  const placeholder =
    isLoading && models.length === 0 ? "Loading..." : "Automatic";
  const helperText = error
    ? undefined
    : // biome-ignore lint/style/noNestedTernary: readable inline conditional
      isLoading
      ? "Fetching available models..."
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        models.length === 0
        ? "This assistant did not expose selectable models."
        : undefined;

  const options = useMemo(() => {
    const opts: ComboSelectOption[] = [
      {
        id: "",
        label: "Automatic (provider default)",
        description: "Let the assistant pick the recommended model.",
      },
    ];
    for (const model of models) {
      opts.push({
        id: model.id,
        label: model.label,
        description: model.description,
      });
    }
    return opts;
  }, [models]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleOpenChange = useCallback((open: boolean) => setIsOpen(open), []);
  const handleSelect = useCallback(
    (id: string) => {
      if (id === "") {
        onClear();
      } else {
        onSelect(id);
      }
    },
    [onClear, onSelect]
  );

  return (
    <>
      <SelectField
        controlRef={anchorRef}
        disabled={false}
        errorMessage={error ?? undefined}
        helperText={helperText}
        label="MODEL"
        onPress={handleOpen}
        placeholder={placeholder}
        value={selectedLabel}
      />
      <Combobox
        anchorRef={anchorRef}
        onOpenChange={handleOpenChange}
        onSelect={handleSelect}
        open={isOpen}
        options={options}
        title="Model"
        value={selectedModel}
      />
    </>
  );
}

interface WorkingDirectoryDropdownProps {
  workingDir: string;
  errorMessage: string;
  disabled: boolean;
  suggestedPaths: string[];
  onSelectPath: (value: string) => void;
}

export function WorkingDirectoryDropdown({
  workingDir,
  errorMessage,
  disabled,
  suggestedPaths,
  onSelectPath,
}: WorkingDirectoryDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  const options = useMemo(
    () => suggestedPaths.map((path) => ({ id: path, label: path })),
    [suggestedPaths]
  );

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleOpenChange = useCallback((open: boolean) => setIsOpen(open), []);

  const emptyText = "No agent directories match your search.";

  return (
    <>
      <SelectField
        controlRef={anchorRef}
        disabled={disabled}
        errorMessage={errorMessage || undefined}
        label="WORKING DIRECTORY"
        onPress={handleOpen}
        placeholder="Choose a working directory"
        testID="working-directory-select"
        value={workingDir}
        valueEllipsizeMode="middle"
      />
      <Combobox
        allowCustomValue
        anchorRef={anchorRef}
        customValueKind="directory"
        customValuePrefix=""
        emptyText={emptyText}
        onOpenChange={handleOpenChange}
        onSelect={onSelectPath}
        open={isOpen}
        options={options}
        optionsPosition="above-search"
        searchPlaceholder="Search directories..."
        title="Working directory"
        value={workingDir}
      />
    </>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled,
}: ToggleRowProps): ReactElement {
  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          onToggle(!value);
        }
      }}
      style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}
    >
      <View
        style={[
          styles.checkbox,
          value && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
        ]}
      >
        {value ? <View style={styles.checkboxDot} /> : null}
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? (
          <Text style={styles.helperText}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export interface GitOptionsSectionProps {
  worktreeMode: "none" | "create" | "attach";
  onWorktreeModeChange: (value: "none" | "create" | "attach") => void;
  worktreeSlug: string;
  currentBranch: string | null;
  baseBranch: string;
  onBaseBranchChange: (value: string) => void;
  status: "idle" | "loading" | "ready" | "error";
  repoError: string | null;
  gitValidationError: string | null;
  baseBranchError: string | null;
  worktreeOptions: Array<{ path: string; label: string }>;
  selectedWorktreePath: string;
  worktreeOptionsStatus: "idle" | "loading" | "ready" | "error";
  worktreeOptionsError: string | null;
  attachWorktreeError: string | null;
  onSelectWorktreePath: (path: string) => void;
}

export function GitOptionsSection({
  worktreeMode,
  onWorktreeModeChange,
  worktreeSlug,
  currentBranch,
  baseBranch,
  onBaseBranchChange,
  status,
  repoError,
  gitValidationError,
  baseBranchError,
  worktreeOptions,
  selectedWorktreePath,
  worktreeOptionsStatus,
  worktreeOptionsError,
  attachWorktreeError,
  onSelectWorktreePath,
}: GitOptionsSectionProps): ReactElement {
  const isLoading = status === "loading";
  const isCreateMode = worktreeMode === "create";
  const isAttachMode = worktreeMode === "attach";
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editedBranch, setEditedBranch] = useState(baseBranch);
  const inputRef = useRef<TextInput>(null);
  const [isWorktreeSheetOpen, setIsWorktreeSheetOpen] = useState(false);

  useEffect(() => {
    setEditedBranch(baseBranch);
  }, [baseBranch]);

  useEffect(() => {
    if (isEditingBranch) {
      inputRef.current?.focus();
    }
  }, [isEditingBranch]);

  const handleStartEdit = useCallback(() => {
    setEditedBranch(baseBranch);
    setIsEditingBranch(true);
  }, [baseBranch]);

  const handleConfirmEdit = useCallback(() => {
    const trimmed = editedBranch.trim();
    if (trimmed) {
      onBaseBranchChange(trimmed);
    }
    setIsEditingBranch(false);
  }, [editedBranch, onBaseBranchChange]);

  const handleCancelEdit = useCallback(() => {
    setEditedBranch(baseBranch);
    setIsEditingBranch(false);
  }, [baseBranch]);

  const displayBranch = baseBranch || currentBranch || "HEAD";
  const selectedWorktreeLabel =
    worktreeOptions.find((option) => option.path === selectedWorktreePath)
      ?.label ?? "";
  const worktreeHelperText =
    worktreeOptionsStatus === "loading"
      ? "Loading worktrees..."
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        worktreeOptions.length === 0
        ? "No worktrees found"
        : null;

  return (
    <View style={styles.gitOptionsContainer}>
      <Pressable
        disabled={isLoading}
        onPress={() => onWorktreeModeChange(isCreateMode ? "none" : "create")}
        style={[
          styles.worktreeToggle,
          isLoading && styles.worktreeToggleDisabled,
        ]}
        testID="worktree-create-toggle"
      >
        <View style={[styles.checkbox, isCreateMode && styles.checkboxChecked]}>
          {isCreateMode ? <View style={styles.checkboxDot} /> : null}
        </View>
        <View style={styles.worktreeToggleContent}>
          <Text style={styles.worktreeToggleLabel}>Create worktree</Text>
          <Text style={styles.worktreeToggleDescription}>
            {isLoading
              ? "Inspecting repository…"
              : // biome-ignore lint/style/noNestedTernary: readable inline conditional
                isCreateMode
                ? `Will create: ${worktreeSlug || "preparing…"}`
                : // biome-ignore lint/style/noNestedTernary: readable inline conditional
                  currentBranch
                  ? `Run isolated from ${currentBranch}`
                  : "Run in an isolated directory"}
          </Text>
        </View>
      </Pressable>

      <Pressable
        disabled={isLoading}
        onPress={() => onWorktreeModeChange(isAttachMode ? "none" : "attach")}
        style={[
          styles.worktreeToggle,
          isLoading && styles.worktreeToggleDisabled,
        ]}
        testID="worktree-attach-toggle"
      >
        <View style={[styles.checkbox, isAttachMode && styles.checkboxChecked]}>
          {isAttachMode ? <View style={styles.checkboxDot} /> : null}
        </View>
        <View style={styles.worktreeToggleContent}>
          <Text style={styles.worktreeToggleLabel}>
            Attach to existing worktree
          </Text>
          <Text style={styles.worktreeToggleDescription}>
            {isLoading
              ? "Inspecting repository…"
              : "Pick an OpenBeam worktree by branch"}
          </Text>
        </View>
      </Pressable>

      {isAttachMode ? (
        <>
          <SelectField
            disabled={isLoading || worktreeOptionsStatus === "loading"}
            errorMessage={attachWorktreeError || worktreeOptionsError}
            helperText={worktreeHelperText}
            label="Worktree"
            onPress={() => setIsWorktreeSheetOpen(true)}
            placeholder="Select a worktree"
            testID="worktree-attach-picker"
            value={selectedWorktreeLabel}
          />
          <DropdownSheet
            onClose={() => setIsWorktreeSheetOpen(false)}
            title="Select worktree"
            visible={isWorktreeSheetOpen}
          >
            {worktreeOptions.map((option, index) => (
              <SelectOption
                key={option.path}
                label={option.label}
                onPress={() => {
                  onSelectWorktreePath(option.path);
                  setIsWorktreeSheetOpen(false);
                }}
                selected={option.path === selectedWorktreePath}
                testID={`worktree-attach-option-${index}`}
              />
            ))}
          </DropdownSheet>
        </>
      ) : null}

      {isCreateMode ? (
        <View style={styles.baseBranchRow}>
          <Text style={styles.baseBranchLabel}>Base branch:</Text>
          {isEditingBranch ? (
            <View style={styles.baseBranchEditRow}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setEditedBranch}
                onSubmitEditing={handleConfirmEdit}
                placeholder="branch name"
                placeholderTextColor={defaultTheme.colors.foregroundMuted}
                ref={inputRef}
                style={styles.baseBranchInput}
                value={editedBranch}
              />
              <Pressable
                hitSlop={8}
                onPress={handleConfirmEdit}
                style={styles.baseBranchIconButton}
              >
                <Check
                  color={defaultTheme.colors.palette.green[500]}
                  size={defaultTheme.iconSize.md}
                />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={handleCancelEdit}
                style={styles.baseBranchIconButton}
              >
                <X
                  color={defaultTheme.colors.foregroundMuted}
                  size={defaultTheme.iconSize.md}
                />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleStartEdit}
              style={styles.baseBranchValueRow}
            >
              <Text style={styles.baseBranchValue}>{displayBranch}</Text>
              <Pencil
                color={defaultTheme.colors.foregroundMuted}
                size={defaultTheme.iconSize.sm}
              />
            </Pressable>
          )}
        </View>
      ) : null}

      {baseBranchError ? (
        <Text style={styles.errorText}>{baseBranchError}</Text>
      ) : null}

      {repoError ? <Text style={styles.errorText}>{repoError}</Text> : null}

      {gitValidationError ? (
        <Text style={styles.errorText}>{gitValidationError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  formSection: {
    gap: theme.spacing[3],
  },
  label: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  dropdownControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  dropdownControlDisabled: {
    opacity: theme.opacity[50],
  },
  dropdownValue: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  dropdownPlaceholder: {
    flex: 1,
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
  },
  bottomSheetBackground: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: theme.borderRadius["2xl"],
    borderTopRightRadius: theme.borderRadius["2xl"],
  },
  bottomSheetHandle: {
    backgroundColor: theme.colors.palette.zinc[600],
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[2],
  },
  dropdownSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dropdownSheetBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.palette.gray[900],
    opacity: 0.45,
  },
  dropdownSheetContainer: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: theme.borderRadius["2xl"],
    borderTopRightRadius: theme.borderRadius["2xl"],
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[6] + theme.spacing[2],
    maxHeight: 560,
    width: "100%",
  },
  dropdownSheetHandle: {
    width: 56,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginBottom: theme.spacing[3],
  },
  dropdownSheetTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  dropdownSheetScrollContent: {
    paddingBottom: theme.spacing[8],
    paddingHorizontal: theme.spacing[1],
  },
  dropdownSheetList: {
    marginTop: theme.spacing[3],
  },
  dropdownSheetOption: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
    marginBottom: theme.spacing[2],
  },
  dropdownSheetOptionSelected: {
    borderColor: theme.colors.palette.blue[400],
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  dropdownSheetOptionLabel: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.semibold,
  },
  dropdownSheetOptionDescription: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing[1],
  },
  dropdownSheetLoading: {
    alignItems: "center",
    paddingVertical: theme.spacing[4],
  },
  errorText: {
    color: theme.colors.palette.red[500],
    fontSize: theme.fontSize.sm,
  },
  warningText: {
    color: theme.colors.palette.orange[500],
    fontSize: theme.fontSize.sm,
  },
  helperText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  selectorColumn: {
    flex: 1,
    gap: theme.spacing[3],
  },
  selectorColumnFull: {
    width: "100%",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  toggleRowDisabled: {
    opacity: theme.opacity[50],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth[2],
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: theme.colors.palette.blue[500],
    backgroundColor: theme.colors.palette.blue[500],
  },
  checkboxDisabled: {
    borderColor: theme.colors.border,
  },
  checkboxDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.palette.white,
  },
  toggleTextContainer: {
    flex: 1,
    gap: theme.spacing[1],
  },
  toggleLabel: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
  input: {
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  dropdownLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  selectFieldContainer: {
    gap: theme.spacing[2],
  },
  selectFieldControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  selectFieldControlDisabled: {
    opacity: theme.opacity[50],
  },
  selectFieldContent: {
    flex: 1,
    gap: theme.spacing[1],
  },
  selectFieldLabel: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectFieldValue: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  selectFieldPlaceholder: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
  },
  gitOptionsContainer: {
    gap: theme.spacing[3],
  },
  worktreeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  worktreeToggleDisabled: {
    opacity: theme.opacity[50],
  },
  worktreeToggleContent: {
    flex: 1,
    gap: theme.spacing[1],
  },
  worktreeToggleLabel: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
  },
  worktreeToggleDescription: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  baseBranchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  baseBranchLabel: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  baseBranchValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  baseBranchValue: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  baseBranchEditRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  baseBranchInput: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
  },
  baseBranchIconButton: {
    padding: theme.spacing[1],
  },
  desktopDropdownOverlay: {
    flex: 1,
  },
  desktopDropdownBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  desktopDropdownContainer: {
    backgroundColor: theme.colors.surface0,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 400,
    overflow: "hidden",
  },
  desktopDropdownScroll: {
    maxHeight: 400,
  },
  desktopDropdownScrollContent: {
    paddingVertical: theme.spacing[1],
  },
  agentConfigRow: {
    flexDirection: {
      xs: "column",
      md: "row",
    },
    gap: theme.spacing[2],
  },
  agentConfigColumn: {
    flex: 1,
  },
  compactSelectControl: {
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    gap: theme.spacing[1],
  },
  compactSelectControlInline: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[1],
  },
  compactSelectControlDisabled: {
    opacity: theme.opacity[50],
  },
  compactSelectTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  compactSelectLeading: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing[1],
  },
  compactSelectValueContainer: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[1],
  },
  compactSelectLabel: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  compactSelectValue: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  compactSelectPlaceholder: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
  },
}));
