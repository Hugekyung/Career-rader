import axios, { isAxiosError } from "axios";
import { getRequiredEnv } from "../utils/env";
import { logger } from "../utils/logger";

export async function sendSlackMessage(text: string): Promise<void> {
  if (process.env.MOCK_SLACK === "true") {
    logger.info("MOCK_SLACK is enabled. Slack message was not sent.");
    console.log(text);
    return;
  }

  const webhookUrl = getRequiredEnv("SLACK_WEBHOOK_URL");

  try {
    await axios.post(webhookUrl, { text });
  } catch (error) {
    if (isAxiosError(error)) {
      logger.error("Failed to send Slack message.", {
        status: error.response?.status,
        body: error.response?.data,
      });
    } else {
      logger.error("Failed to send Slack message.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}
