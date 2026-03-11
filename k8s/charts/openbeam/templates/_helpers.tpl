{{- define "openbeam.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openbeam.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "openbeam.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openbeam.labels" -}}
helm.sh/chart: {{ include "openbeam.chart" . }}
app.kubernetes.io/name: {{ include "openbeam.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "openbeam.selectorLabels" -}}
app.kubernetes.io/name: {{ include "openbeam.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "openbeam.configMapName" -}}
{{- printf "%s-env" (include "openbeam.fullname" .) -}}
{{- end -}}

{{- define "openbeam.appSecretName" -}}
{{- if .Values.appSecret.name -}}
{{- .Values.appSecret.name -}}
{{- else -}}
{{- printf "%s-app-secrets" (include "openbeam.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "openbeam.sandboxSecretName" -}}
{{- if .Values.sandboxSecret.name -}}
{{- .Values.sandboxSecret.name -}}
{{- else -}}
{{- printf "%s-sandbox-secrets" (include "openbeam.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "openbeam.serverName" -}}
{{- printf "%s-server" (include "openbeam.fullname" .) -}}
{{- end -}}

{{- define "openbeam.webName" -}}
{{- printf "%s-web" (include "openbeam.fullname" .) -}}
{{- end -}}

{{- define "openbeam.workerName" -}}
{{- printf "%s-worker" (include "openbeam.fullname" .) -}}
{{- end -}}

{{- define "openbeam.engineName" -}}
{{- printf "%s-engine" (include "openbeam.fullname" .) -}}
{{- end -}}

{{- define "openbeam.image" -}}
{{- if .global.registry -}}
{{ .global.registry }}/{{ .image.repository }}:{{ .image.tag | default "latest" }}
{{- else -}}
{{ .image.repository }}:{{ .image.tag | default "latest" }}
{{- end -}}
{{- end -}}
