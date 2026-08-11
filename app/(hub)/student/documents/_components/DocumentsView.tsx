"use client";

import { FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StudentContractView } from "@/modules/contract/contract.types";
import type { User } from "@/modules/user/user.types";
import { ContractSigner } from "@/components/contract/ContractSigner";
import { SignedContractCard } from "./SignedContractCard";

interface DocumentsViewProps {
  user: User;
  contracts: StudentContractView[];
}

export function DocumentsView({ user, contracts }: DocumentsViewProps) {
  const pending = contracts.filter((c) => c.status === "PENDING_SIGNATURE");
  const others = contracts.filter((c) => c.status !== "PENDING_SIGNATURE");

  return (
    <AppLayout role={user.role} userName={user.name} userAvatarUrl={user.avatarUrl}>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Documentos"
          description="Aqui ficam o seu contrato de curso e os documentos da sua matrícula."
        />

        {contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento por aqui"
            description="Assim que a sua matrícula for registrada, o contrato do curso aparece aqui para leitura e assinatura."
          />
        ) : (
          <div className="space-y-6">
            {pending.map((contract) => (
              <ContractSigner key={contract.id} contract={contract} user={user} />
            ))}
            {others.map((contract) => (
              <SignedContractCard key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
