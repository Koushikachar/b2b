import { z } from "zod";

/** A supplier notice shown to buyers on Account → Notifications. */
export const announcementSchema = z.object({
  title: z
    .string({ error: "Add a title." })
    .trim()
    .min(3, "Use at least 3 characters for the title.")
    .max(80, "Keep the title under 80 characters."),
  message: z
    .string({ error: "Add a message." })
    .trim()
    .min(1, "Add a message.")
    .max(300, "Keep the message under 300 characters."),
});
