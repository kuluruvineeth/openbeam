{{- define "openplane.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openplane.fullname" -}}
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

{{- define "openplane.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openplane.labels" -}}
helm.sh/chart: {{ include "openplane.chart" . }}
app.kubernetes.io/name: {{ include "openplane.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "openplane.selectorLabels" -}}
app.kubernetes.io/name: {{ include "openplane.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "openplane.configMapName" -}}
{{- printf "%s-env" (include "openplane.fullname" .) -}}
{{- end -}}

{{- define "openplane.appSecretName" -}}
{{- if .Values.appSecret.name -}}
{{- .Values.appSecret.name -}}
{{- else -}}
{{- printf "%s-app-secrets" (include "openplane.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "openplane.sandboxSecretName" -}}
{{- if .Values.sandboxSecret.name -}}
{{- .Values.sandboxSecret.name -}}
{{- else -}}
{{- printf "%s-sandbox-secrets" (include "openplane.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "openplane.serverName" -}}
{{- printf "%s-server" (include "openplane.fullname" .) -}}
{{- end -}}

{{- define "openplane.webName" -}}
{{- printf "%s-web" (include "openplane.fullname" .) -}}
{{- end -}}

{{- define "openplane.workerName" -}}
{{- printf "%s-worker" (include "openplane.fullname" .) -}}
{{- end -}}

{{- define "openplane.engineName" -}}
{{- printf "%s-engine" (include "openplane.fullname" .) -}}
{{- end -}}
