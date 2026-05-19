"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Monitor, Radio, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." })
});

const highlights = [
  {
    title: "Fleet view",
    description: "Track every display unit, every browser screen, and every live heartbeat from one surface.",
    icon: Monitor,
  },
  {
    title: "Campaign workflow",
    description: "Upload media, stage playlists, and push assignments into any screen count.",
    icon: UploadCloud,
  },
  {
    title: "Read-only playback",
    description: "TV browsers stay minimal. Control stays in CMS, exactly like your build notes describe.",
    icon: Radio,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", { 
        email: values.email, 
        password: values.password, 
        redirect: false 
      });
      
      if (res?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Login successful");
        router.replace("/dashboard");
      }
    } catch {
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_30px_100px_-55px_rgba(15,23,42,0.55)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white md:px-10 md:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.28),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.24),transparent_24%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">VAART-E CMS</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight md:text-5xl">
              Open signage CMS for TVs, projectors, tablets, and kiosks.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
              Manage waterproof display boxes, campaign uploads, approval workflow, and live playback from one professional control surface.
            </p>

            <div className="mt-10 grid gap-4">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                  <item.icon className="h-5 w-5 text-orange-300" />
                  <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center bg-white px-6 py-8 md:px-10 md:py-12">
          <Card className="w-full border-slate-200/80 bg-transparent shadow-none">
            <CardHeader className="px-0">
              <CardTitle className="text-3xl font-semibold tracking-tight text-slate-950">Sign in</CardTitle>
              <CardDescription className="text-slate-600">
                Use your admin or campaigner account to enter portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="admin@vaart.com"
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="••••••••"
                              type="password"
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Enter portal"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
