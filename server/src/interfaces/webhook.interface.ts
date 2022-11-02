import { WEBHOOK_ACTION } from "src/enums/webhookActions.enum";

export interface WebhookResponse {
  type: WEBHOOK_ACTION;
  status: string;
  data?: any;
}
