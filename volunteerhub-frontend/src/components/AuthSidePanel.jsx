export default function AuthSidePanel() {
    return (
        <section className="hidden lg:flex lg:col-span-7 bg-cyan-400 relative overflow-hidden flex-col justify-between p-16">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-cyan-700 rounded-xl flex items-center justify-center text-white">
                        <span className="text-lg">❤</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-slate-900">
                        VolunteerHub
                    </span>
                </div>

                <h1 className="text-6xl font-extrabold tracking-tighter leading-tight text-slate-900 max-w-xl">
                    The Art of <span className="text-cyan-800">Impact.</span>
                </h1>

                <p className="mt-8 text-xl text-slate-800/80 max-w-lg leading-relaxed">
                    Transforming community management into a curated experience. Join a
                    global network of purpose-driven individuals.
                </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
                <div className="bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white/20 -rotate-2">
                    <div className="text-cyan-700 text-4xl mb-4">📈</div>
                    <h3 className="font-bold text-lg text-slate-900">Visual Impact</h3>
                    <p className="text-sm opacity-80 mt-2">
                        Real-time data storytelling for every contribution.
                    </p>
                </div>

                <div className="bg-cyan-700/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 translate-y-12">
                    <div className="text-cyan-700 text-4xl mb-4">👥</div>
                    <h3 className="font-bold text-lg text-slate-900">Seamless Sync</h3>
                    <p className="text-sm opacity-80 mt-2">
                        Connecting organizers and volunteers effortlessly.
                    </p>
                </div>
            </div>

            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-full h-full bg-gradient-to-br from-white to-cyan-300" />
            </div>
        </section>
    );
}