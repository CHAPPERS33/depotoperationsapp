// app/home/page.tsx
'use client';
import UpdatedLoginForm from '../../components/UpdatedLoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <UpdatedLoginForm />
    </div>
  );
}
