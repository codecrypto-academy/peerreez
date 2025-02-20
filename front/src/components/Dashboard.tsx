import { Outlet } from 'react-router-dom';
import {Header} from "./Header";

export function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center p-6 space-y-6 bg-gray-50">
      <Header />
      <div className="w-full max-w-4xl">
        <Outlet />
      </div>
    </div>
  );
  
  }