"use client"

import { useParams } from "next/navigation"
import { TranslationEditor } from "@/components/admin/translation-editor"

export default function TranslationEditorPage() {
  const { code } = useParams<{ code: string }>()
  return <TranslationEditor languageCode={code} />
}
