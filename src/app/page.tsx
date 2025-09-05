import { redirect } from 'next/navigation';

export default function Page() {
  // Redirect "/" to "/today"
  redirect('/today');
}
