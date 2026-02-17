"use client"

import { use } from "react"
import { TranslationEditor } from "@/components/admin/translation-editor"

export default function TranslationEditorPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  return <TranslationEditor languageCode={code} />
}
