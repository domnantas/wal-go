import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@WAL-GO/ui/components/select";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@WAL-GO/ui/components/tabs";
import { sessionOptions } from "@better-auth-ui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardTab } from "@/domains/admin/dashboard-tab";
import { NewsletterTab } from "@/domains/admin/newsletter-tab";
import { QsosTab } from "@/domains/admin/qsos-tab";
import { SeasonsTab } from "@/domains/admin/seasons-tab";
import { SettingsTab } from "@/domains/admin/settings-tab";
import { UploadsTab } from "@/domains/admin/uploads-tab";
import { UsersTab } from "@/domains/admin/users-tab";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";

const adminTabs = [
	{ value: "dashboard", label: "Apžvalga", Component: DashboardTab },
	{ value: "users", label: "Naudotojai", Component: UsersTab },
	{ value: "seasons", label: "Sezonai", Component: SeasonsTab },
	{ value: "qsos", label: "QSO", Component: QsosTab },
	{ value: "uploads", label: "Įkėlimai", Component: UploadsTab },
	{ value: "newsletter", label: "Naujienlaiškis", Component: NewsletterTab },
	{ value: "settings", label: "Nustatymai", Component: SettingsTab },
] as const;

export const Route = createFileRoute("/admin")({
	async beforeLoad({ context: { queryClient } }) {
		const session = await getUser();
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
		if (!session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		if (session.user.role !== "admin") {
			throw redirect({ to: "/" });
		}
		return { session };
	},
	component: AdminPage,
});

function AdminPage() {
	const [activeTab, setActiveTab] = useState<string>(adminTabs[0].value);
	const activeLabel = adminTabs.find((tab) => tab.value === activeTab)?.label;

	return (
		<main className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<h1 className="font-bold font-serif text-3xl">Administravimas</h1>
			<Tabs onValueChange={setActiveTab} value={activeTab}>
				<Select
					onValueChange={(value) => value && setActiveTab(value)}
					value={activeTab}
				>
					<SelectTrigger className="w-full sm:hidden">
						<SelectValue>{activeLabel}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{adminTabs.map((tab) => (
							<SelectItem key={tab.value} value={tab.value}>
								{tab.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<TabsList className="hidden max-w-full overflow-x-auto sm:inline-flex">
					{adminTabs.map((tab) => (
						<TabsTrigger key={tab.value} value={tab.value}>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
				{adminTabs.map(({ value, Component }) => (
					<TabsContent key={value} value={value}>
						<Component />
					</TabsContent>
				))}
			</Tabs>
		</main>
	);
}
