"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Filter, Download, Mail, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Role } from "@/modules/user/user.types";

interface UserItem {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone?: string;
  status: "Active" | "Inactive";
  avatar: string;
}

export function UsersList() {
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const mockUsers: UserItem[] = [
    { id: "usr-1", name: "Emma Thompson", role: "TEACHER", email: "emma.t@english4you.edu", phone: "+55 11 98888-1111", status: "Active", avatar: "ET" },
    { id: "usr-2", name: "Liam Garcia", role: "STUDENT", email: "liam.g@student.e4y.com", phone: "+55 11 97777-2222", status: "Active", avatar: "LG" },
    { id: "usr-3", name: "Olivia Chen", role: "STUDENT", email: "olivia.c@student.e4y.com", phone: "+55 11 96666-3333", status: "Inactive", avatar: "OC" },
    { id: "usr-4", name: "Noah Patel", role: "STUDENT", email: "noah.p@student.e4y.com", phone: "+55 11 95555-4444", status: "Active", avatar: "NP" },
    { id: "usr-5", name: "Marcus Johnson", role: "ADMIN", email: "marcus.j@english4you.edu", phone: "+55 11 94444-5555", status: "Active", avatar: "MJ" },
    { id: "usr-6", name: "Sophia Kim", role: "TEACHER", email: "sophia.k@english4you.edu", phone: "+55 11 93333-6666", status: "Active", avatar: "SK" },
    { id: "usr-7", name: "Lucas Silva", role: "STUDENT", email: "lucas.s@student.e4y.com", phone: "+55 11 92222-7777", status: "Active", avatar: "LS" },
    { id: "usr-8", name: "Mia Wong", role: "STUDENT", email: "mia.w@student.e4y.com", phone: "+55 11 91111-8888", status: "Active", avatar: "MW" },
  ];

  const filteredUsers = mockUsers.filter((u) => {
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <AppLayout role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 text-sm mt-1">Gerencie alunos, professores e a equipe administrativa da escola.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-initial">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Usuário
            </Button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              onClick={() => setFilterRole("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "ALL" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterRole("STUDENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "STUDENT" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Alunos
            </button>
            <button
              onClick={() => setFilterRole("TEACHER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "TEACHER" ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Professores
            </button>
            <button
              onClick={() => setFilterRole("ADMIN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "ADMIN" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Admins
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nome</th>
                  <th className="px-6 py-3.5">Perfil (Role)</th>
                  <th className="px-6 py-3.5">E-mail</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm
                          ${user.role === 'TEACHER' ? 'bg-amber-100 text-amber-800' : 
                            user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 
                            'bg-emerald-100 text-emerald-800'}`}>
                          {user.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        user.role === 'TEACHER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={`font-medium ${user.status === 'Active' ? 'text-slate-700' : 'text-slate-400'}`}>
                          {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>Exibindo {filteredUsers.length} de {mockUsers.length} usuários</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Anterior</Button>
              <Button variant="outline" size="sm">Próximo</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
