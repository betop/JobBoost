"use client";

import { useFieldArray, type Control, type FieldValues, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import Input from "@/components/Input";

interface CertificationFieldsProps<T extends FieldValues> {
  control: Control<T>;
  register: UseFormRegister<T>;
}

// Repeatable certification rows for a profile. Empty rows are dropped on save; with no rows at all the
// resume generator proposes certifications itself.
export default function CertificationFields<T extends FieldValues>({ control, register }: CertificationFieldsProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name: "certifications" as never });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-semibold text-gray-900">Certifications</h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ name: "", issuer: "", date: "" } as never)}
        >
          <Plus className="w-4 h-4" />
          Add certification
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Shown on the resume as entered. Leave empty and the resume generator suggests certifications as before.
      </p>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded"
              aria-label="Remove certification"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Certification" {...register(`certifications.${index}.name` as never)} />
              <Input label="Issuer" placeholder="e.g. AWS" {...register(`certifications.${index}.issuer` as never)} />
              <Input label="Date" placeholder="e.g. 2024-05" {...register(`certifications.${index}.date` as never)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
