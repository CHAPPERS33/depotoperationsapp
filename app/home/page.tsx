// app/home/page.tsx
'use client';
import LoginForm from '../../components/LoginForm'; // ✅ Change this line

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginForm /> {/* ✅ Change this line too */}
    </div>
  );
}