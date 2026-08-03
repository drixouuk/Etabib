"use client";

import { useState, useRef, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Turnstile, { type TurnstileHandle } from "@/components/ui/Turnstile";

type Props = {
  locale: string;
};

export default function ContactForm({ locale }: Props) {
  const t = useTranslations("contact");
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim(),
          "cf-turnstile-response": turnstileToken,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Erreur lors de l'envoi. Veuillez réessayer.");
      turnstileRef.current?.reset();
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-base font-medium text-stone-700">{t("success")}</p>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors duration-200"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">{t("name_label")}</label>
        <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder={t("name_placeholder")} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-stone-700">{t("phone_label")}</label>
        <input id="phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("phone_placeholder")} className={inputClass} />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-stone-700">{t("message_label")}</label>
        <textarea id="message" rows={4} required value={message} onChange={e => setMessage(e.target.value)} placeholder={t("message_placeholder")} className={`${inputClass} resize-none`} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Turnstile ref={turnstileRef} onTokenChange={setTurnstileToken} />
      <Button type="submit" disabled={sending || !turnstileToken} className="w-full bg-primary-700 py-2.5 text-base text-white hover:bg-primary-800 disabled:opacity-50">
        {sending ? "Envoi…" : t("send")}
      </Button>
    </form>
  );
}
