-- Index for support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_unread_counts_user_id ON chat_unread_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_unread_counts_chat_id ON chat_unread_counts(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_unread_counts_user_chat ON chat_unread_counts(user_id, chat_id);


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id)

-- Create indexes for better performance
CREATE INDEX idx_early_access_email ON early_access_signups(email);
CREATE INDEX idx_early_access_position ON early_access_signups(signup_position);
CREATE INDEX idx_early_access_created_at ON early_access_signups(created_at);
CREATE INDEX idx_early_access_unclaimed ON early_access_signups(is_claimed)

-- Add indexes for faster queries
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_message_reactions_emoji ON message_reactions(emoji);

-- Optional index for faster location-based queries
create index clients_location_idx on public.clients (latitude, longitude);