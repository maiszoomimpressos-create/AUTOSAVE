"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type VehicleInput = {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  proprietario: string;
};

function parseVehicleForm(formData: FormData): VehicleInput {
  return {
    placa: String(formData.get("placa") ?? "").trim().toUpperCase(),
    marca: String(formData.get("marca") ?? "").trim(),
    modelo: String(formData.get("modelo") ?? "").trim(),
    ano: Number(formData.get("ano")),
    cor: String(formData.get("cor") ?? "").trim(),
    proprietario: String(formData.get("proprietario") ?? "").trim(),
  };
}

function validate(data: VehicleInput) {
  const errors: Partial<Record<keyof VehicleInput, string>> = {};
  if (!data.placa) errors.placa = "Placa é obrigatória.";
  if (!data.marca) errors.marca = "Marca é obrigatória.";
  if (!data.modelo) errors.modelo = "Modelo é obrigatório.";
  if (!data.ano || data.ano < 1900 || data.ano > new Date().getFullYear() + 1) {
    errors.ano = "Ano inválido.";
  }
  if (!data.cor) errors.cor = "Cor é obrigatória.";
  if (!data.proprietario) errors.proprietario = "Proprietário é obrigatório.";
  return errors;
}

export async function listVehicles(query?: string) {
  return prisma.vehicle.findMany({
    where: query
      ? {
          OR: [
            { placa: { contains: query } },
            { marca: { contains: query } },
            { modelo: { contains: query } },
            { proprietario: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getVehicle(id: string) {
  return prisma.vehicle.findUnique({ where: { id } });
}

export async function createVehicle(_prevState: unknown, formData: FormData) {
  const data = parseVehicleForm(formData);
  const errors = validate(data);
  if (Object.keys(errors).length > 0) {
    return { errors, values: data };
  }

  const existing = await prisma.vehicle.findUnique({ where: { placa: data.placa } });
  if (existing) {
    return { errors: { placa: "Já existe um veículo com essa placa." }, values: data };
  }

  await prisma.vehicle.create({ data });
  revalidatePath("/");
  redirect("/");
}

export async function updateVehicle(id: string, _prevState: unknown, formData: FormData) {
  const data = parseVehicleForm(formData);
  const errors = validate(data);
  if (Object.keys(errors).length > 0) {
    return { errors, values: data };
  }

  const existing = await prisma.vehicle.findUnique({ where: { placa: data.placa } });
  if (existing && existing.id !== id) {
    return { errors: { placa: "Já existe um veículo com essa placa." }, values: data };
  }

  await prisma.vehicle.update({ where: { id }, data });
  revalidatePath("/");
  redirect("/");
}

export async function deleteVehicle(id: string) {
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/");
}
