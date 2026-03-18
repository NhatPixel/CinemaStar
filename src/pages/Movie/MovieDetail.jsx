import { AppHeader, AppFooter, Icon, Text, Button } from '../../components/ui'

function MovieDetail() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-12">
        <div className="@container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* Movie Poster */}
            <div className="lg:col-span-4 @[480px]:max-w-md mx-auto lg:max-w-none w-full">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-primary/20 group">
                <img
                  alt="Movie Poster"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src="/assets/movie-sample.jpg"
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Đang chiếu
                </div>
              </div>
            </div>

            {/* Trailer & Title Area */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Text
                  variant="h1"
                  className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
                >
                  Người Vợ Cuối Cùng
                </Text>
                <Text variant="body" className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                  Một tác phẩm của đạo diễn Victor Vũ lấy cảm hứng từ tiểu thuyết Hồ Oán Hận.
                </Text>
              </div>

              {/* Trailer Player */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-xl group cursor-pointer">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60"
                  style={{ backgroundImage: "url('/assets/movie-sample.jpg')" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="size-20 bg-primary/90 hover:bg-primary text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg">
                    <Icon name="play_arrow" className="text-4xl" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      Xem Trailer
                    </span>
                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-primary" />
                    </div>
                    <span className="text-xs text-white">2:15</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-2">
                <Button className="flex-1 sm:flex-none min-w-[200px] py-4 px-8 rounded-xl flex items-center justify-center gap-2">
                  <Icon name="confirmation_number" />
                  Đặt vé ngay
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 sm:flex-none bg-slate-200 dark:bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5"
                >
                  <Icon name="favorite" />
                  Yêu thích
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Movie Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full" />
              Thông tin chi tiết
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-8 gap-x-4 glass-panel p-8 rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Đạo diễn
                </span>
                <span className="text-lg font-medium">Victor Vũ</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Thể loại
                </span>
                <span className="text-lg font-medium">Tâm lý, Cổ trang</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Thời lượng
                </span>
                <span className="text-lg font-medium">132 phút</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Khởi chiếu
                </span>
                <span className="text-lg font-medium">03/11/2023</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Quốc gia
                </span>
                <span className="text-lg font-medium">Việt Nam</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Ngôn ngữ
                </span>
                <span className="text-lg font-medium">Tiếng Việt</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Độ tuổi
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">
                    T16
                  </span>
                  <span className="text-sm">Từ 16 tuổi trở lên</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Định dạng
                </span>
                <span className="text-lg font-medium">2D | Digital</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Trạng thái
                </span>
                <span className="text-primary font-bold">ĐANG CHIẾU</span>
              </div>
            </div>

            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-8 bg-primary rounded-full" />
                Nội dung phim
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                Lấy bối cảnh Việt Nam thế kỷ 19, &quot;Người Vợ Cuối Cùng&quot; là câu chuyện về
                cuộc đời của Linh - người vợ thứ ba của quan tri huyện. Giữa những định kiến khắt
                khe của xã hội phong kiến, cô phải đấu tranh cho tình yêu và sự tự do của bản thân.
                Phim tái hiện chân thực bức tranh xã hội thời bấy giờ với những góc khuất đầy bi
                thương nhưng cũng không kém phần lãng mạn. Một kiệt tác hình ảnh mới nhất từ đạo
                diễn Victor Vũ mang đậm bản sắc văn hóa Việt.
              </p>
            </div>
          </div>

          {/* Cast Section */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full" />
              Diễn viên
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { name: 'Kaity Nguyễn', role: 'Vai Linh' },
                { name: 'Thuận Nguyễn', role: 'Vai Nhân' },
                { name: 'NSƯT Quang Thắng', role: 'Vai Quan Tri Huyện' },
                { name: 'Kim Oanh', role: 'Vai Mợ Cả' },
              ].map((actor) => (
                <div key={actor.name} className="flex items-center gap-4 glass-panel p-4 rounded-xl">
                  <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/30">
                    <Icon name="person" className="text-3xl" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{actor.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      {actor.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}

export default MovieDetail

