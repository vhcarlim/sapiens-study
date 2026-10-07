import { createFileRoute } from "@tanstack/react-router";
import { handleReviewChat } from "@/lib/review-chat.server";

export const Route = createFileRoute("/api/review-chat")({ server: { handlers: { POST: ({ request }) => handleReviewChat(request) } } });