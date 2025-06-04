import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, Users, Brain, Search } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const quickActions = [
    {
      title: "Time Tracking",
      description: "Log your billable hours",
      icon: <Clock className="h-6 w-6" />,
      href: "#"
    },
    {
      title: "HR Portal",
      description: "Access HR resources",
      icon: <Users className="h-6 w-6" />,
      href: "#"
    },
    {
      title: "Document Search",
      description: "Find case files",
      icon: <Search className="h-6 w-6" />,
      href: "#"
    },
  ];

  const aiResources = [
    { title: "AI Legal Research Guide", description: "How to use AI for legal research" },
    { title: "Drafting with AI", description: "Best practices for AI-assisted document drafting" },
    { title: "AI Ethics in Law", description: "Understanding the ethical implications of AI" },
  ];

  const templates = [
    { title: "Pleading Paper", type: "Word" },
    { title: "Motion Template", type: "Word" },
    { title: "Deposition Summary", type: "Word" },
    { title: "Client Intake Form", type: "PDF" },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="hover:bg-accent hover:text-accent-foreground transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {action.title}
                  </CardTitle>
                  {action.icon}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ai">
              <Brain className="mr-2 h-4 w-4" />
              AI Resources
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="mr-2 h-4 w-4" />
              Document Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {aiResources.map((resource, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {templates.map((template, index) => (
                <Card key={index} className="hover:bg-accent/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{template.title}</CardTitle>
                    <CardDescription className="text-xs">{template.type} Template</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Links - Minimal Design */}
        <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/40">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Quick Links</h3>
          <div className="space-y-3">
            <Link href="#" className="group flex items-center space-x-3 rounded-md p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">Legal Research Portal</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Westlaw, LexisNexis, and more</p>
              </div>
            </Link>

            <Link href="#" className="group flex items-center space-x-3 rounded-md p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-green-600 dark:text-gray-100 dark:group-hover:text-green-400">Team Directory</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Contact information and roles</p>
              </div>
            </Link>

            <Link href="#" className="group flex items-center space-x-3 rounded-md p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-purple-600 dark:text-gray-100 dark:group-hover:text-purple-400">Firm Announcements</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Latest updates and news</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
