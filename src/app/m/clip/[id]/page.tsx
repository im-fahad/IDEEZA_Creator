"use client";

// One clip on its own (a copied link, Saved › View original post, a search
// result): the Feed's clip with Back over it, and its comments open on arrival
// when the link named a comment.

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ClipPage } from "@/components/mobile/feed/clip-page";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  return <ClipPage id={decodeURIComponent(id)} withComments={params.has("comment")} />;
}
