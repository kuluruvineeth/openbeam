const SLACK_TEXT_MAX_LENGTH = 500;
const SLACK_TEXT_TRUNCATE_AT = 497;

export function truncateForSlack(text: string): string {
  if (text.length <= SLACK_TEXT_MAX_LENGTH) {
    return text;
  }
  return `${text.slice(0, SLACK_TEXT_TRUNCATE_AT)}...`;
}
