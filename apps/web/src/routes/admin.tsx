import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@WAL-GO/ui/components/tabs";
import { sessionOptions } from "@better-auth-ui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardTab } from "@/domains/admin/dashboard-tab";
import { NewsletterTab } from "@/domains/admin/newsletter-tab";
import { QsosTab } from "@/domains/admin/qsos-tab";
import { SeasonsTab } from "@/domains/admin/seasons-tab";
import { SettingsTab } from "@/domains/admin/settings-tab";
import { UploadsTab } from "@/domains/admin/uploads-tab";
import { UsersTab } from "@/domains/admin/users-tab";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";

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
	return (
		<main className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<h1 className="font-bold font-serif text-3xl">Administravimas</h1>
			<Tabs defaultValue="dashboard">
				<TabsList>
					<TabsTrigger value="dashboard">Apžvalga</TabsTrigger>
					<TabsTrigger value="users">Naudotojai</TabsTrigger>
					<TabsTrigger value="seasons">Sezonai</TabsTrigger>
					<TabsTrigger value="qsos">QSO</TabsTrigger>
					<TabsTrigger value="uploads">Įkėlimai</TabsTrigger>
					<TabsTrigger value="newsletter">Naujienlaiškis</TabsTrigger>
					<TabsTrigger value="settings">Nustatymai</TabsTrigger>
				</TabsList>
				<TabsContent value="dashboard">
					<DashboardTab />
				</TabsContent>
				<TabsContent value="users">
					<UsersTab />
				</TabsContent>
				<TabsContent value="seasons">
					<SeasonsTab />
				</TabsContent>
				<TabsContent value="qsos">
					<QsosTab />
				</TabsContent>
				<TabsContent value="uploads">
					<UploadsTab />
				</TabsContent>
				<TabsContent value="newsletter">
					<NewsletterTab />
				</TabsContent>
				<TabsContent value="settings">
					<SettingsTab />
				</TabsContent>
			</Tabs>
		</main>
	);
}
