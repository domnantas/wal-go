import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/log')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/log"!</div>
}
