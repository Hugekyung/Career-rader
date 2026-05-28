import axios, { isAxiosError } from "axios";
import { getRequiredEnv } from "../utils/env";
import { logger } from "../utils/logger";

export async function sendSlackMessage(input: {
  text: string;
  webhookEnvName: string;
}): Promise<void> {
  if (process.env.MOCK_SLACK === "true") {
    logger.info("MOCK_SLACK is enabled. Slack message was not sent.", {
      webhookEnvName: input.webhookEnvName,
    });
    console.log(input.text);
    return;
  }

  const webhookUrl = getRequiredEnv(input.webhookEnvName);

  try {
    await axios.post(webhookUrl, { text: input.text });
  } catch (error) {
    if (isAxiosError(error)) {
      logger.error("Failed to send Slack message.", {
        webhookEnvName: input.webhookEnvName,
        status: error.response?.status,
        body: error.response?.data,
      });
    } else {
      logger.error("Failed to send Slack message.", {
        webhookEnvName: input.webhookEnvName,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}
