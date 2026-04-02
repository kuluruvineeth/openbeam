import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface EmailActionResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type SendMailPayload = {
  message: {
    subject: string;
    body: { contentType: string; content: string };
    toRecipients: Array<{ emailAddress: { address: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string } }>;
  };
  saveToSentItems?: boolean;
};

export async function sendEmail(
  client: MicrosoftGraphClient,
  options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }
): Promise<EmailActionResult> {
  try {
    const payload: SendMailPayload = {
      message: {
        subject: options.subject,
        body: {
          contentType: options.isHtml ? "HTML" : "Text",
          content: options.body,
        },
        toRecipients: options.to.map((addr) => ({
          emailAddress: { address: addr },
        })),
        ccRecipients: options.cc?.map((addr) => ({
          emailAddress: { address: addr },
        })),
        bccRecipients: options.bcc?.map((addr) => ({
          emailAddress: { address: addr },
        })),
      },
      saveToSentItems: true,
    };

    await client.post<void>("/me/sendMail", payload);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function replyToEmail(
  client: MicrosoftGraphClient,
  options: { messageId: string; body: string; replyAll?: boolean }
): Promise<EmailActionResult> {
  try {
    const endpoint = options.replyAll ? "replyAll" : "reply";
    await client.post<void>(`/me/messages/${options.messageId}/${endpoint}`, {
      comment: options.body,
    });

    return { success: true, messageId: options.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reply",
    };
  }
}

export async function moveEmail(
  client: MicrosoftGraphClient,
  options: { messageId: string; destinationFolderId: string }
): Promise<EmailActionResult> {
  try {
    await client.post<void>(`/me/messages/${options.messageId}/move`, {
      destinationId: options.destinationFolderId,
    });

    return { success: true, messageId: options.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move email",
    };
  }
}
