"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Query the client_login table for authentication
      const { data, error: queryError } = await supabase
        .from("client_login")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

      if (queryError || !data) {
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Store user data in localStorage for session management
      localStorage.setItem("user", JSON.stringify(data));

      console.log("Login successful!");
      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/20 via-neutral-950 to-neutral-950" />

      {/* Animated Glowing Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-sm z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="flex items-end justify-center gap-1 mb-6">
            <Image
              src="/cliniclab-logo.png"
              alt="Clinic Lab AI Logo"
              width={48}
              height={48}
              className="w-12 h-12"
            />
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-white">Clinic Lab </span>
              <span className="text-sky-500">AI</span>
            </h1>
          </div>
          <p className="text-neutral-400 text-base font-normal">
            Access your Virtual AI Receptionist Portal
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="shadow-2xl border-0 bg-neutral-900/80 backdrop-blur-xl border-neutral-800/50">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-white tracking-tight">
              Welcome back
            </CardTitle>
            <CardDescription className="text-center text-neutral-400 text-sm font-normal">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-neutral-200 tracking-wide"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-400 focus:border-sky-500 focus:ring-sky-500/20 text-sm font-normal rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-neutral-200 tracking-wide"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-indigo-500/20 text-sm font-normal rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-neutral-600 bg-neutral-800 text-sky-500 focus:ring-sky-500/20 focus:ring-2 w-4 h-4"
                  />
                  <span className="text-neutral-300 font-normal">
                    Remember me
                  </span>
                </label>
                <a
                  href="#"
                  className="text-indigo-500 hover:text-indigo-400 font-semibold transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 tracking-wide rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-400 font-normal">
                Don&apos;t have an account?{" "}
                <a
                  href="#"
                  className="text-indigo-500 hover:text-indigo-400 font-semibold transition-colors"
                >
                  Contact administrator
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-500 font-normal tracking-wide">
            © 2024 ClinicLab Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
