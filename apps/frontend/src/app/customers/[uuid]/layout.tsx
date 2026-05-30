export default function CustomerChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="absolute inset-0 flex flex-col min-h-0 w-full overflow-hidden bg-[#f0f2f5]">
            {children}
        </div>
    );
}
