"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Add01Icon,
  Upload01Icon,
  Building02Icon,
  ChartAverageIcon,
  ChevronRightIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  DiscountTag01Icon,
  Package01Icon,
  PaintBrush01Icon,
  PercentIcon,
  PuzzleIcon,
  SettingsIcon,
  ShoppingCart01Icon,
  UserGroup02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavUser } from "@/components/layout/nav-user"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { AreaAccess } from "@/lib/supplier/permissions"

function isEdit(productPath: string): boolean {
  return /\/products\/[\w-]+\/edit$/.test(productPath)
}

type NavLink = { href: string; label: string; icon: IconSvgElement; active: boolean }

/**
 * A section with sub-pages (Analytics, Products, Settings). Expanded, it is a
 * collapsible list; collapsed to icons the list would be hidden, so the icon
 * opens a flyout menu with the same links instead.
 */
function NavGroup({
  label,
  icon,
  active,
  links,
  onNavigate,
}: {
  label: string
  icon: IconSvgElement
  active: boolean
  links: NavLink[]
  onNavigate: () => void
}) {
  const { state, isMobile } = useSidebar()
  // Controlled: `active` changes on navigation, and an uncontrolled
  // Collapsible must not get a new default (Base UI warning). Entering the
  // section opens it; the user can still close it.
  const [open, setOpen] = useState(active)
  const [prevActive, setPrevActive] = useState(active)
  if (active !== prevActive) {
    setPrevActive(active)
    if (active) setOpen(true)
  }

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton isActive={active} tooltip={label} />}
          >
            <HugeiconsIcon icon={icon} strokeWidth={2} />
            <span>{label}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {links.map((link) => (
                <DropdownMenuItem
                  key={link.href}
                  render={<Link href={link.href} />}
                  className={link.active ? "bg-accent font-medium" : undefined}
                >
                  <HugeiconsIcon icon={link.icon} strokeWidth={2} />
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={<SidebarMenuButton isActive={active} tooltip={label} />}
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
        <span>{label}</span>
        <HugeiconsIcon
          icon={ChevronRightIcon}
          strokeWidth={2}
          className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {links.map((link) => (
            <SidebarMenuSubItem key={link.href}>
              <SidebarMenuSubButton
                render={<Link href={link.href} />}
                isActive={link.active}
                onClick={onNavigate}
              >
                <HugeiconsIcon icon={link.icon} strokeWidth={2} />
                <span>{link.label}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

const COMMING_SOON_TOP: [string, IconSvgElement][] = [
  ["Delivery", DeliveryTruck01Icon],
  ["Payouts", Wallet01Icon],
  ["Appearance", PaintBrush01Icon],
  ["Plugins", PuzzleIcon],
]

export function SupplierSidebar({
  user,
  kybStatus,
  isStaff = false,
  access = { products: true, orders: true, all: true },
}: {
  user: { name: string; email: string }
  kybStatus: string
  /** Any team member (not the owner): hides owner-only settings. */
  isStaff?: boolean
  /** Sections the user's role can open (lib/supplier/permissions). */
  access?: AreaAccess
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  // On mobile the sidebar renders as a Sheet with a hidden close button,
  // so every navigation link must close it explicitly.
  const closeMobile = () => setOpenMobile(false)
  const dashboardActive = pathname === "/supplier/dashboard"
  const ordersActive = pathname.startsWith("/supplier/dashboard/orders")
  const salesActive = pathname.startsWith("/supplier/dashboard/analytics/sales")
  const trafficActive = pathname.startsWith(
    "/supplier/dashboard/analytics/traffic"
  )
  const productsAnalyticsActive = pathname.startsWith(
    "/supplier/dashboard/analytics/products"
  )
  const analyticsActive = pathname.startsWith("/supplier/dashboard/analytics")
  const discountsActive = pathname.startsWith("/supplier/dashboard/discounts")
  const audienceActive = pathname.startsWith("/supplier/dashboard/audience")
  const productsListActive = pathname === "/supplier/dashboard/products"
  const addProductActive = pathname === "/supplier/dashboard/products/new"
  const importActive = pathname === "/supplier/dashboard/products/import"
  const marginActive = pathname === "/supplier/dashboard/products/margin"
  const productEditActive =
    pathname.startsWith("/supplier/dashboard/products/") && isEdit(pathname)
  const productsActive =
    productsListActive || addProductActive || importActive || productEditActive || marginActive
  const businessActive = pathname.startsWith("/supplier/dashboard/business")
  const teamActive = pathname.startsWith("/supplier/dashboard/team")
  const settingsActive = businessActive || teamActive

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={closeMobile}
              render={<Link href="/supplier/dashboard" />}
            >
              <span className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={Building02Icon} strokeWidth={2} />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">My business</span>
                <span className="truncate text-xs text-muted-foreground">
                  Seller workspace
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {access.all ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/supplier/dashboard" />}
                isActive={dashboardActive}
                onClick={closeMobile}
                tooltip="Dashboard"
              >
                <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          {access.orders ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/supplier/dashboard/orders" />}
                isActive={ordersActive}
                onClick={closeMobile}
                tooltip="Orders"
              >
                <HugeiconsIcon icon={ShoppingCart01Icon} strokeWidth={2} />
                <span>Orders</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}

          {COMMING_SOON_TOP.slice(0, 1).map(([label, icon]) => (
            <SidebarMenuItem key={label}>
              <SidebarMenuButton
                aria-disabled="true"
                tooltip={label}
                className="cursor-default"
                title="Coming soon"
              >
                <HugeiconsIcon icon={icon} strokeWidth={2} />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {access.all ? (
            <>
              <NavGroup
                label="Analytics"
                icon={ChartAverageIcon}
                active={analyticsActive}
                onNavigate={closeMobile}
                links={[
                  { href: "/supplier/dashboard/analytics/sales", label: "Sales", icon: ChartAverageIcon, active: salesActive },
                  { href: "/supplier/dashboard/analytics/traffic", label: "Traffic", icon: UserGroup02Icon, active: trafficActive },
                  { href: "/supplier/dashboard/analytics/products", label: "Products", icon: Package01Icon, active: productsAnalyticsActive },
                ]}
              />

              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/supplier/dashboard/discounts" />}
                  isActive={discountsActive}
                  onClick={closeMobile}
                  tooltip="Discounts"
                >
                  <HugeiconsIcon icon={DiscountTag01Icon} strokeWidth={2} />
                  <span>Discounts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/supplier/dashboard/audience" />}
                  isActive={audienceActive}
                  onClick={closeMobile}
                  tooltip="Audience"
                >
                  <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />
                  <span>Audience</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : null}

          {access.products ? (
            <NavGroup
              label="Products"
              icon={Package01Icon}
              active={productsActive}
              onNavigate={closeMobile}
              links={[
                { href: "/supplier/dashboard/products", label: "All products", icon: Package01Icon, active: productsListActive },
                { href: "/supplier/dashboard/products/new", label: "Add product", icon: Add01Icon, active: addProductActive },
                { href: "/supplier/dashboard/products/import", label: "Import products", icon: Upload01Icon, active: importActive },
                ...(isStaff
                  ? []
                  : [{ href: "/supplier/dashboard/products/margin", label: "Margin", icon: PercentIcon, active: marginActive }]),
              ]}
            />
          ) : null}

          {COMMING_SOON_TOP.slice(1).map(([label, icon]) => (
            <SidebarMenuItem key={label}>
              <SidebarMenuButton
                aria-disabled="true"
                tooltip={label}
                className="cursor-default"
                title="Coming soon"
              >
                <HugeiconsIcon icon={icon} strokeWidth={2} />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {isStaff ? null : (
            <NavGroup
              label="Settings"
              icon={SettingsIcon}
              active={settingsActive}
              onNavigate={closeMobile}
              links={[
                { href: "/supplier/dashboard/business", label: "Business profile", icon: Building02Icon, active: businessActive },
                { href: "/supplier/dashboard/team", label: "Team", icon: UserGroup02Icon, active: teamActive },
              ]}
            />
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <StatusBadge
          status="kyb"
          value={kybStatus}
          className="mx-2 justify-center"
        />
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
