import BrandMark from "@/Components/BrandMark";
import Dropdown from "@/Components/Dropdown";
import NavLink from "@/Components/NavLink";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import { PageProps } from "@/types";
import { Link, router, usePage } from "@inertiajs/react";
import { PropsWithChildren, ReactNode, useState } from "react";

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, activeCompany, availableCompanies } =
        usePage<PageProps>().props;
    const user = auth.user;
    const isAdmin = auth.is_admin;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    function switchCompany(companyId: number) {
        router.post(route("company.switch"), { company_id: companyId });
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/">
                                    <BrandMark compact />
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href={route("dashboard")}
                                    active={route().current("dashboard")}
                                >
                                    Dashboard
                                </NavLink>
                                <NavLink
                                    href={route("clients.index")}
                                    active={route().current("clients.*")}
                                >
                                    Clients
                                </NavLink>
                                <NavLink
                                    href={route("clients.import")}
                                    active={route().current("clients.import")}
                                >
                                    Import
                                </NavLink>
                                <NavLink
                                    href={route("payment-links.index")}
                                    active={route().current(
                                        "payment-links.index",
                                    )}
                                >
                                    Payment Links
                                </NavLink>
                                <NavLink
                                    href={route("rcm-logs.index")}
                                    active={route().current("rcm-logs.index")}
                                >
                                    RCM Logs
                                </NavLink>

                                {isAdmin && (
                                    <>
                                        <NavLink
                                            href={route(
                                                "admin.companies.index",
                                            )}
                                            active={route().current(
                                                "admin.companies.*",
                                            )}
                                        >
                                            Companies
                                        </NavLink>
                                        <NavLink
                                            href={route("admin.users.index")}
                                            active={route().current(
                                                "admin.users.*",
                                            )}
                                        >
                                            Users
                                        </NavLink>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center gap-3">
                            {/* Company Switcher */}
                            {availableCompanies.length > 1 && (
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-4 text-slate-600 transition duration-150 ease-in-out hover:text-brand-700 focus:outline-none"
                                            >
                                                <svg
                                                    className="me-1.5 h-4 w-4 text-slate-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                    />
                                                </svg>
                                                {activeCompany?.name ??
                                                    "No Company"}
                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        {availableCompanies.map((co) => (
                                            <button
                                                key={co.id}
                                                type="button"
                                                onClick={() =>
                                                    switchCompany(co.id)
                                                }
                                                className={`block w-full px-4 py-2 text-left text-sm leading-5 transition duration-150 ease-in-out focus:outline-none ${
                                                    activeCompany?.id === co.id
                                                        ? "bg-brand-50 font-semibold text-brand-700"
                                                        : "text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                {co.name}
                                            </button>
                                        ))}
                                    </Dropdown.Content>
                                </Dropdown>
                            )}

                            {/* User Menu */}
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-slate-600 transition duration-150 ease-in-out hover:text-brand-700 focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route("profile.edit")}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route("logout")}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 transition duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-700 focus:bg-slate-100 focus:text-slate-700 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? "inline-flex"
                                                : "hidden"
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? "inline-flex"
                                                : "hidden"
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? "block" : "hidden") +
                        " sm:hidden"
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route("dashboard")}
                            active={route().current("dashboard")}
                        >
                            Dashboard
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route("clients.index")}
                            active={route().current("clients.*")}
                        >
                            Clients
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route("clients.import")}
                            active={route().current("clients.import")}
                        >
                            Import
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route("payment-links.index")}
                            active={route().current("payment-links.index")}
                        >
                            Payment Links
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route("rcm-logs.index")}
                            active={route().current("rcm-logs.index")}
                        >
                            RCM Logs
                        </ResponsiveNavLink>

                        {isAdmin && (
                            <>
                                <ResponsiveNavLink
                                    href={route("admin.companies.index")}
                                    active={route().current(
                                        "admin.companies.*",
                                    )}
                                >
                                    Companies
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route("admin.users.index")}
                                    active={route().current("admin.users.*")}
                                >
                                    Users
                                </ResponsiveNavLink>
                            </>
                        )}
                    </div>

                    <div className="border-t border-slate-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-slate-800">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-slate-500">
                                {user.email}
                            </div>
                            {activeCompany && (
                                <div className="mt-1 text-xs text-slate-400">
                                    {activeCompany.name}
                                </div>
                            )}
                        </div>

                        {availableCompanies.length > 1 && (
                            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                                <div className="px-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Switch Company
                                </div>
                                {availableCompanies.map((co) => (
                                    <button
                                        key={co.id}
                                        type="button"
                                        onClick={() => switchCompany(co.id)}
                                        className={`block w-full px-4 py-2 text-left text-sm ${
                                            activeCompany?.id === co.id
                                                ? "font-semibold text-brand-700"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        {co.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route("profile.edit")}>
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route("logout")}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="border-b border-slate-200/60 bg-white/70 shadow-sm">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
