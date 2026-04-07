export interface DocusignEnvelopeCreateResult {
  envelopeId: string | undefined;
  url: string | undefined;
}

export interface DocusignEnvelopeVoidResult {
  envelopeId: string | undefined;
}

export interface DocusignEnvelopeResendResult {
  envelopeId: string | undefined;
}

export interface DocusignActionResults {
  envelope_create: DocusignEnvelopeCreateResult;
  envelope_void: DocusignEnvelopeVoidResult;
  envelope_resend: DocusignEnvelopeResendResult;
}
