ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

