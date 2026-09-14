"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema } from "@/lib/validation/schemas";
import type { z } from "zod";
import { formatWhatsappInput } from "@/lib/validation/whatsapp";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { formatCep } from "@/lib/validation/cep";
import { storeTypeLabels } from "@/lib/labels";
import type { StoreType } from "@/types/lead";
import { Button } from "@/components/ui/Button";
import { CONSENT_TEXT } from "@/lib/config/consent";

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  onSubmit: (values: RegistrationFormValues) => Promise<void>;
  submitting: boolean;
  submitError?: string | null;
}

const inputClasses =
  "w-full rounded-xl border-2 border-smoke bg-white px-4 py-3 text-base text-ink placeholder:text-muted focus:border-graphite focus:outline-none";

const errorClasses = "mt-1 text-sm text-danger";

const storeTypeOptions = Object.entries(storeTypeLabels) as [StoreType, string][];

export function RegistrationForm({ onSubmit, submitting, submitError }: RegistrationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      whatsapp: "",
      businessName: "",
      instagram: "",
      address: "",
      addressNumber: "",
      neighborhood: "",
      zipCode: "",
      addressComplement: "",
      cpfCnpj: "",
      email: "",
      storeType: [],
      consent: undefined,
    },
  });

  const [cpfCnpjDisplay, setCpfCnpjDisplay] = useState("");
  const [whatsappDisplay, setWhatsappDisplay] = useState("");
  const [zipCodeDisplay, setZipCodeDisplay] = useState("");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Nome completo</label>
        <input className={inputClasses} placeholder="Seu nome" {...register("name")} />
        {errors.name ? <p className={errorClasses}>{errors.name.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">WhatsApp</label>
        <Controller
          control={control}
          name="whatsapp"
          render={({ field }) => (
            <input
              className={inputClasses}
              placeholder="(84) 99999-9999"
              inputMode="tel"
              value={whatsappDisplay}
              onChange={(e) => {
                const formatted = formatWhatsappInput(e.target.value);
                setWhatsappDisplay(formatted);
                field.onChange(formatted);
              }}
            />
          )}
        />
        {errors.whatsapp ? <p className={errorClasses}>{errors.whatsapp.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Nome da loja / negócio</label>
        <input className={inputClasses} placeholder="Ex: Fit Store" {...register("businessName")} />
        {errors.businessName ? (
          <p className={errorClasses}>{errors.businessName.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Instagram da loja física ou virtual
        </label>
        <input className={inputClasses} placeholder="@sualoja" {...register("instagram")} />
        {errors.instagram ? <p className={errorClasses}>{errors.instagram.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">CPF ou CNPJ</label>
        <Controller
          control={control}
          name="cpfCnpj"
          render={({ field }) => (
            <input
              className={inputClasses}
              placeholder="000.000.000-00"
              inputMode="numeric"
              value={cpfCnpjDisplay}
              onChange={(e) => {
                const formatted = formatCpfCnpj(e.target.value);
                setCpfCnpjDisplay(formatted);
                field.onChange(formatted);
              }}
            />
          )}
        />
        {errors.cpfCnpj ? <p className={errorClasses}>{errors.cpfCnpj.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Endereço</label>
        <input className={inputClasses} placeholder="Rua, avenida..." {...register("address")} />
        {errors.address ? <p className={errorClasses}>{errors.address.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Número da residência</label>
          <input className={inputClasses} placeholder="Nº" {...register("addressNumber")} />
          {errors.addressNumber ? (
            <p className={errorClasses}>{errors.addressNumber.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Bairro</label>
          <input className={inputClasses} placeholder="Seu bairro" {...register("neighborhood")} />
          {errors.neighborhood ? (
            <p className={errorClasses}>{errors.neighborhood.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">CEP</label>
          <Controller
            control={control}
            name="zipCode"
            render={({ field }) => (
              <input
                className={inputClasses}
                placeholder="00000-000"
                inputMode="numeric"
                value={zipCodeDisplay}
                onChange={(e) => {
                  const formatted = formatCep(e.target.value);
                  setZipCodeDisplay(formatted);
                  field.onChange(formatted);
                }}
              />
            )}
          />
          {errors.zipCode ? <p className={errorClasses}>{errors.zipCode.message}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Complemento</label>
          <input
            className={inputClasses}
            placeholder="Apto, bloco..."
            {...register("addressComplement")}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">E-mail</label>
        <input
          className={inputClasses}
          placeholder="voce@email.com"
          type="email"
          {...register("email")}
        />
        {errors.email ? <p className={errorClasses}>{errors.email.message}</p> : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Qual o tipo da sua loja?</label>
        <Controller
          control={control}
          name="storeType"
          render={({ field }) => (
            <div className="space-y-2">
              {storeTypeOptions.map(([value, label]) => {
                const selected = field.value?.includes(value) ?? false;
                return (
                  <label key={value} className="flex items-center gap-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-graphite"
                      checked={selected}
                      onChange={() => {
                        const current = field.value ?? [];
                        field.onChange(
                          selected ? current.filter((v) => v !== value) : [...current, value]
                        );
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.storeType ? <p className={errorClasses}>{errors.storeType.message}</p> : null}
      </div>

      <label className="flex items-start gap-3 pt-2 text-sm text-muted">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-graphite" {...register("consent")} />
        <span>{CONSENT_TEXT}</span>
      </label>
      {errors.consent ? <p className={errorClasses}>{errors.consent.message}</p> : null}

      {submitError ? <p className={errorClasses}>{submitError}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "ENVIANDO..." : "CONCLUIR CADASTRO"}
      </Button>
    </form>
  );
}
