import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { GitHubRepositorySelection } from '~/features/github';

export const meta: MetaFunction = () => {
  return [
    { title: 'Select Repositories | GitHub Integration | EcoTrace' },
    { name: 'description', content: 'Choose which repositories to track for carbon footprint monitoring' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated and GitHub is connected
  // This would typically validate the GitHub connection status
  return json({ success: true });
}

export default function GitHubRepositoriesRoute() {
  return <GitHubRepositorySelection />;
}