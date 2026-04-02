"use client";

import dynamic from "next/dynamic";

const AllergyMapContent = dynamic(() => import("./map-content"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">지도를 불러오는 중...</p>
      </div>
    </div>
  ),
});

export default function AllergyMapPage() {
  return <AllergyMapContent />;
}
