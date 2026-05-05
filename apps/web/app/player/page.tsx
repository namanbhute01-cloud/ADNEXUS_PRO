import { Suspense } from "react";
import { DevicePlayer } from "@/components/device-player";

export const dynamic = "force-dynamic";

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          Connecting player...
        </div>
      }
    >
      <DevicePlayer />
    </Suspense>
  );
}
