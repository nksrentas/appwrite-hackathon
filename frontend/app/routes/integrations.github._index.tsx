import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { GitHubDashboard } from '~/features/github';

export const meta: MetaFunction = () => {
  return [
    { title: 'GitHub Integration | EcoTrace' },
    { name: 'description', content: 'Manage your GitHub integration and monitor repository carbon footprint' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication and GitHub connection status
  return json({ success: true });
}

export default function GitHubIntegrationRoute() {
  return <GitHubDashboard />;
}