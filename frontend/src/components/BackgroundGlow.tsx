const BackgroundGlow = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-40 -right-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-pink-500/30 rounded-full blur-[100px] sm:blur-[150px]" />
      <div className="absolute top-1/4 -left-40 w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] bg-pink-600/25 rounded-full blur-[100px] sm:blur-[150px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[700px] sm:h-[700px] bg-pink-400/15 rounded-full blur-[120px] sm:blur-[180px]" />
      <div className="absolute bottom-20 right-10 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-purple-500/20 rounded-full blur-[80px] sm:blur-[120px]" />
    </div>
  );
};

export default BackgroundGlow;
