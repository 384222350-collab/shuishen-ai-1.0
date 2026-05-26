export type OneBotMessagePart =
  | { type: "text"; data: { text: string } }
  | { type: "at"; data: { qq: string } }
  | { type: "image"; data: { file?: string; url?: string } }
  | { type: string; data: Record<string, string | undefined> };

export interface OneBotMessageEvent {
  post_type: "message";
  message_type: "private" | "group";
  sub_type?: string;
  message_id: number;
  user_id: number;
  group_id?: number;
  self_id?: number;
  raw_message?: string;
  message: string | OneBotMessagePart[];
}

export interface NormalizedQqMessage {
  conversationId: string;
  messageType: "private" | "group";
  userId: number;
  groupId?: number;
  text: string;
  imageUrls: string[];
  mentionedSelf: boolean;
}
