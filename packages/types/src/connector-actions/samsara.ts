export interface SamsaraAlertResolveResult {
  resolved: true;
}

export interface SamsaraDriverMessageSendResult {
  sent: true;
}

export interface SamsaraActionResults {
  alert_resolve: SamsaraAlertResolveResult;
  driver_message_send: SamsaraDriverMessageSendResult;
}
