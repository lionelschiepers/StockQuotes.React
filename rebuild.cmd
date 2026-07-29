rd /s /q node_modules
rd /s /q .next
rd /s /q out
del pnpm-lock.yaml
cmd /c pnpm.cmd i
cmd /c pnpm.cmd outdated
cmd /c pnpm.cmd run lint
cmd /c pnpm.cmd run format
cmd /c pnpm.cmd test
cmd /c pnpm.cmd run build

