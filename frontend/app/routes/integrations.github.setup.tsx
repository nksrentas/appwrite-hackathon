import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { GitHubConnectionSetup } from '~/features/github';

export const meta: MetaFunction = () => {
  return [
    { title: 'Connect GitHub | EcoTrace' },
    { name: 'description', content: 'Connect your GitHub account to track development carbon footprint' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated
  // This would typically check session/cookies for user authentication
  // For now, we'll just return success
  return json({ success: true });
}

export default function GitHubSetupRoute() {
  return <GitHubConnectionSetup />;
}