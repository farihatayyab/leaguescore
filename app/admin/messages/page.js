import { listMessages } from "@/lib/messages";
import MessagesList from "@/components/admin/MessagesList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function AdminMessages() {
  const items = await listMessages();
  return <MessagesList items={items} />;
}
