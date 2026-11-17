export interface RegionalNarrative {
  readonly visitorFirst: readonly string[];
  readonly cast: readonly [string,string]; readonly premise: string;
  readonly intro: readonly [string,string]; readonly morningPrompt: readonly [string,string];
  readonly morning: readonly (readonly [string,string,string])[];
  readonly memories: readonly string[]; readonly lunchPrompt: readonly [string,string];
  readonly lunch: readonly (readonly [string,string,string])[];
  readonly afternoon: readonly [string,string]; readonly creative: readonly [string,string];
  readonly postcards: readonly (readonly [string,string,string])[];
  readonly rest: readonly [string,string]; readonly quiet: readonly [string,string,string];
  readonly chat: readonly [string,string]; readonly endings: readonly string[];
}
export const regionalNarratives: Readonly<Record<string, RegionalNarrative>> = {
  "hai-phong": {
    "cast": [
      "Huy",
      "Mai"
    ],
    "premise": "Bạn là Huy, hẹn Mai đi một ngày ở Hải Phòng. Mai mang theo một tấm bưu thiếp trắng, định cuối ngày sẽ viết cho người bạn ở xa.",
    "intro": [
      "Cậu đã biết sẽ viết gì chưa?",
      "Chưa. Phải đi với Huy một ngày đã."
    ],
    "morningPrompt": [
      "Mình bắt đầu ở Nhà hát, hay tìm hiểu câu chuyện trong bảo tàng?",
      "Cho mình chọn chỗ khiến tấm bưu thiếp có chuyện để kể nhé."
    ],
    "morning": [
      [
        "Mai lùi một bước để ngắm mặt tiền Nhà hát, còn Huy đứng giữ chỗ bên cạnh.",
        "Cứ nhìn cả tòa nhà là mình không biết nên bắt đầu từ đâu.",
        "Thử chọn một khung cửa thôi. Rồi nhìn rộng ra."
      ],
      [
        "Hai người mở phần tư liệu về Bảo tàng Hải Phòng. Mai dừng ở đoạn giới thiệu, không lướt qua ngay.",
        "Mình toàn nhớ tên thành phố, ít khi nhớ chuyện của nó.",
        "Vậy hôm nay mình đọc chậm một chuyện thôi."
      ]
    ],
    "memories": [
      "khung cửa ở Nhà hát mà mình đứng ngắm mãi",
      "lần hai đứa dừng lại đọc tư liệu về Bảo tàng Hải Phòng",
      "bát bánh đa cua mình nếm từng chút",
      "phần nem cua bể chia giữa bàn"
    ],
    "lunchPrompt": [
      "Tấm bưu thiếp vẫn trắng à?",
      "Ừ, nhưng bụng mình thì đang réo. Huy cứu trước đi."
    ],
    "lunch": [
      [
        "Huy đặt bát bánh đa cua trước mặt Mai. Mai cầm đũa rồi lại nhìn lên.",
        "Ăn xong có phải viết cảm nhận không?",
        "Không. Nhưng nhớ chừa mình thời gian ăn cùng."
      ],
      [
        "Mai kéo phần nem vào giữa bàn, nhường Huy lấy trước.",
        "Mình muốn nhớ tên món này, chắc lát nữa phải ghi lại.",
        "Nếm trước đi. Chuyện ghi sổ để sau cũng kịp."
      ]
    ],
    "afternoon": [
      "Chiều mình làm bố cục cho tấm bưu thiếp, hay nghỉ rồi kể nhau nghe?",
      "Mình thích là vẫn còn được chọn."
    ],
    "creative": [
      "Khung hình hay mảng màu sẽ hợp hơn nhỉ?",
      "Chọn một thứ làm điểm bắt đầu thôi. Không cần nhét hết Hải Phòng lên giấy."
    ],
    "postcards": [
      [
        "Mai chừa một góc giấy bên cạnh ảnh chặng sáng.",
        "Chỗ này để mình viết một câu.",
        "Vậy phần hình cứ gọn thôi."
      ],
      [
        "Mai đặt mảng hồng cạnh ảnh rồi bật cười.",
        "Không có lý do gì đâu, hôm nay mình thích màu này.",
        "Thế cũng đủ lý do để chọn rồi."
      ]
    ],
    "rest": [
      "Mình muốn ngồi nhìn thêm một lát, Huy ngồi cùng nhé?",
      "Ừ. Tấm bưu thiếp không chạy mất đâu."
    ],
    "quiet": [
      "Mai đặt bưu thiếp xuống, ngồi cạnh Huy.",
      "Hóa ra ngồi không cũng không thấy phí thời gian.",
      "Có người ngồi cùng là được rồi."
    ],
    "chat": [
      "Nếu chỉ viết một câu thì khó ghê.",
      "Cứ kể điều cậu nhớ trước, đừng lo viết cho hay."
    ],
    "endings": [
      "Mai giữ một khoảng trắng bên phần hình để viết lời nhắn. Huy nhắc: đừng quên ký cả hai tên.",
      "Tông màu Mai chọn ở lại bên bức ảnh. Huy không chọn hộ, nhưng ngồi cạnh đến lúc Mai thấy vừa mắt.",
      "Bưu thiếp vẫn còn chỗ trống. Mai nhận ra hôm nay không cần ghi kín mới là một ngày đủ đầy.",
      "Mai viết: Huy dẫn đường, còn chuyện để kể thì hai đứa cùng tìm thấy."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "quang-ninh": {
    "cast": [
      "Khánh",
      "Vy"
    ],
    "premise": "Bạn là Khánh. Vy đến Hạ Long với thói quen chụp rất nhiều ảnh, nhưng thường chẳng nhớ mình thích tấm nào. Hôm nay hai người thử đi chậm hơn.",
    "intro": [
      "Tối nay mình chỉ chọn một tấm để giữ thôi nhé?",
      "Khó đấy. Nhưng Khánh đi cùng thì mình thử."
    ],
    "morningPrompt": [
      "Ngắm cảnh vịnh trước, hay tìm hiểu tư liệu làng chài?",
      "Mình muốn có cả điều để nhìn lẫn điều để nghĩ."
    ],
    "morning": [
      [
        "Vy giơ máy lên trước cảnh vịnh, rồi hạ xuống khi Khánh vẫn đứng yên.",
        "Cậu đang nhìn gì thế?",
        "Đường viền của mấy khối núi. Thử nhìn mà chưa chụp xem."
      ],
      [
        "Hai người cùng xem ảnh và tư liệu về làng chài. Vy phóng to một góc nhỏ.",
        "Trong ảnh còn nhiều chuyện ngoài phong cảnh nhỉ?",
        "Ừ. Mình đọc phần giới thiệu trước khi tự đoán nhé."
      ]
    ],
    "memories": [
      "đường viền núi trên vịnh mà hai đứa nhìn trước khi chụp",
      "chi tiết đời sống trong tư liệu làng chài",
      "phần xôi chả mực mình thử trước khi thêm nước chấm",
      "bữa bánh cuốn chả mực khiến mình tạm cất máy"
    ],
    "lunchPrompt": [
      "Cho máy ảnh nghỉ ăn trưa cùng mình được chưa?",
      "Được. Lần này mình ăn trước, kể sau."
    ],
    "lunch": [
      [
        "Vy nhìn phần xôi chả mực, định tìm máy rồi đổi ý.",
        "Tấm ảnh này chắc không cần đâu.",
        "Ừ. Bữa trưa cứ để mình nhớ bằng cách khác."
      ],
      [
        "Khánh kéo ghế sang để hai người cùng ngồi thoải mái bên phần bánh cuốn.",
        "Mình cứ sợ bỏ lỡ thứ gì nếu không chụp.",
        "Thế thử đừng bỏ lỡ bữa trưa này trước đã."
      ]
    ],
    "afternoon": [
      "Giờ chọn ảnh làm ý tưởng bưu thiếp, hay ngồi nghỉ?",
      "Mình muốn thử giữ lại một điều, thay vì gom thêm."
    ],
    "creative": [
      "Mình chọn bố cục trước hay màu trước?",
      "Cái nào khiến cậu nghĩ tới hôm nay trước thì chọn."
    ],
    "postcards": [
      [
        "Vy đặt ảnh chặng sáng bên tờ giấy nằm ngang.",
        "Chừa rộng thế này có ít quá không?",
        "Không. Mắt mình cũng cần chỗ nghỉ."
      ],
      [
        "Vy thử mảng xanh cạnh ảnh rồi bỏ bớt một màu.",
        "Ít màu hơn mà mình lại thích hơn.",
        "Vậy giữ cách ấy đi."
      ]
    ],
    "rest": [
      "Mình muốn dừng mà không phải đợi chụp xong mới dừng.",
      "Vậy cất máy xuống đây, mình ngồi cùng."
    ],
    "quiet": [
      "Vy úp điện thoại xuống, nhìn thêm một lúc.",
      "Không có ảnh cho đoạn này nhé.",
      "Nhưng có mình nhớ cùng cậu."
    ],
    "chat": [
      "Mình tưởng hôm nay sẽ phải xóa bớt cả trăm tấm.",
      "Giờ thử chọn một chuyện để kể thay vì một tấm đẹp nhất xem."
    ],
    "endings": [
      "Vy giữ một bố cục thoáng từ ảnh buổi sáng. Khánh thấy tấm giấy cuối cùng cũng có chỗ cho lời nhắn.",
      "Một bảng màu ít hơn dự tính khép lại buổi chiều. Vy không cố đưa cả ngày vào một khung hình nữa.",
      "Có một đoạn cuối ngày không nằm trong máy ảnh. Khánh và Vy đều không thấy thiếu.",
      "Vy ghi rằng có người cùng nhìn một cảnh khiến mình nhớ lâu hơn một tấm ảnh chụp vội."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "ninh-binh": {
    "cast": [
      "Bình",
      "Chi"
    ],
    "premise": "Bạn là Bình. Chi đến Ninh Bình với một danh sách dài đến mức vừa mở ra đã thở dài. Bình rủ bạn chọn một chặng sáng thôi, rồi xem ngày hôm nay sẽ đi về đâu.",
    "intro": [
      "Cất danh sách đi cũng được. Mình không kiểm tra cậu đã đi bao nhiêu chỗ đâu.",
      "Thế thì hôm nay mình đi chơi thật nhé."
    ],
    "morningPrompt": [
      "Cảnh Tràng An, hay câu chuyện Hoa Lư?",
      "Một chỗ thôi à? Lần đầu mình thấy dễ thở vì được chọn ít."
    ],
    "morning": [
      [
        "Chi nhìn đường nước giữa những khối núi trong cảnh Tràng An. Bình chờ bạn ngắm xong.",
        "Mình cứ muốn nhìn thêm, mà lại lo chậm.",
        "Chậm hơn ai đâu. Hôm nay có hai đứa mình thôi."
      ],
      [
        "Chi đọc lại một đoạn tư liệu về Hoa Lư rồi hỏi Bình chỗ chưa rõ.",
        "Mình từng học đến đây, nhưng nhớ toàn những mốc rời rạc.",
        "Mình ghép lại một chuyện trước. Chưa hiểu thì đọc thêm, không phải đoán."
      ]
    ],
    "memories": [
      "đường nước và những khối núi ở Tràng An",
      "đoạn tư liệu Hoa Lư hai đứa cùng đọc lại",
      "miếng cơm cháy mình nếm chậm trong bữa trưa",
      "phần chả dê kéo câu chuyện buổi sáng sang tận bữa ăn"
    ],
    "lunchPrompt": [
      "Trong danh sách của cậu có mục nghỉ ăn không?",
      "Có lẽ mình nên viết nó lên đầu."
    ],
    "lunch": [
      [
        "Bình đặt cơm cháy giữa bàn. Chi thử một miếng nhỏ rồi mỉm cười.",
        "Món này mình có thể ngồi ăn mà không nhìn đồng hồ.",
        "Được, hôm nay mình giữ đồng hồ hộ cậu."
      ],
      [
        "Chi ngồi xuống với phần chả dê, vừa ăn vừa kể chi tiết đã chú ý lúc sáng.",
        "Hình như cậu không nhìn thấy góc mình vừa kể.",
        "Thế kể lại đi. Mình muốn nghe cách cậu nhìn."
      ]
    ],
    "afternoon": [
      "Làm một tấm bưu thiếp, hay để buổi chiều có một khoảng trống?",
      "Khoảng trống nghe cũng hấp dẫn đấy."
    ],
    "creative": [
      "Mình cứ sợ tấm giấy còn trắng là chưa làm xong.",
      "Khoảng trắng cũng nằm trong bố cục mà. Thử chọn hình hoặc màu trước nhé."
    ],
    "postcards": [
      [
        "Chi nhìn ảnh chặng sáng, dùng ngón tay thử một đường trên giấy.",
        "Một nét thôi đã gợi được chỗ mình nhớ rồi.",
        "Vậy đừng vội thêm nhiều."
      ],
      [
        "Chi ghép vài mảng xanh rồi dừng lại.",
        "Mình giữ mấy màu này, được không?",
        "Cậu đâu cần xin phép mình để thích chúng."
      ]
    ],
    "rest": [
      "Mình không cần lên lịch cho đoạn nghỉ này đúng không?",
      "Đúng. Cứ ngồi xuống trước đã."
    ],
    "quiet": [
      "Chi gấp danh sách cũ lại, đặt vào túi.",
      "Lần sau mình sẽ để lịch thưa hơn.",
      "Còn bây giờ cứ nghỉ cùng mình."
    ],
    "chat": [
      "Mình chưa đi hết danh sách mà vẫn có nhiều chuyện để kể.",
      "Thử kể điều đầu tiên hiện lên, mình sẽ kể phần mình nhớ."
    ],
    "endings": [
      "Chi giữ bố cục đơn giản trên tờ giấy. Bình thấy danh sách cũ không còn được mở ra nữa.",
      "Vài mảng xanh thay cho một lịch trình kín. Chi bảo lần sau sẽ mang ít kế hoạch hơn.",
      "Buổi chiều có một khoảng trống thật sự. Bình và Chi đều thấy ngày hôm nay đã đủ.",
      "Chi ghi: mình không đi được nhiều chỗ nhất, nhưng đã có thời gian nhìn và nghe một người bạn."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "thua-thien-hue": {
    "cast": [
      "Duy",
      "Ngọc"
    ],
    "premise": "Bạn là Duy. Ngọc nhờ bạn dẫn khám phá một ngày ở Huế, mang theo cuốn sổ để ghi những câu hỏi chưa có lời giải.",
    "intro": [
      "Có câu nào mình chưa biết thì cùng tìm hiểu, đừng trông mình thuộc hết nhé.",
      "Vậy tốt. Mình cũng không muốn đi thi vấn đáp."
    ],
    "morningPrompt": [
      "Mình tìm hiểu Kinh thành, hay bắt đầu từ sông Hương?",
      "Nghe Duy kể hai gợi ý thôi mà sổ mình đã có câu hỏi rồi."
    ],
    "morning": [
      [
        "Ngọc nhìn chi tiết cổng trong ảnh Kinh thành rồi lật phần giới thiệu.",
        "Mình thấy nhiều thứ quá, không biết nên hỏi gì trước.",
        "Chọn chi tiết cậu vừa dừng mắt ở đó. Mình bắt đầu từ nó."
      ],
      [
        "Hai người nhìn cảnh sông Hương. Ngọc im lặng lâu hơn Duy tưởng.",
        "Mình chưa nghĩ được một câu thật hay để tả.",
        "Chưa cần tả đâu. Cứ nhìn thêm đã."
      ]
    ],
    "memories": [
      "chi tiết ở Kinh thành khiến mình mở cuốn sổ ra hỏi",
      "đoạn nhìn sông Hương mà mình chưa muốn tìm lời để tả",
      "bát bún bò mình nếm rồi mới điều chỉnh vị",
      "phần bánh nậm khiến hai đứa ngồi ăn chậm lại"
    ],
    "lunchPrompt": [
      "Sổ có thêm câu hỏi rồi, còn mình cần thêm bữa trưa.",
      "Mình chọn món trước nhé, câu nào chưa xong để chiều kể."
    ],
    "lunch": [
      [
        "Duy ngồi xuống đối diện Ngọc bên phần bún bò.",
        "Nếu mình nêm khác Duy thì có bị nhắc không?",
        "Không. Cứ nếm một chút rồi chọn vị vừa với cậu."
      ],
      [
        "Ngọc cẩn thận mở phần bánh nậm, Duy chờ bạn thử trước.",
        "Có những món làm mình tự nhiên ăn chậm hơn.",
        "Vậy hôm nay mình cứ ăn chậm cùng nhau."
      ]
    ],
    "afternoon": [
      "Giữ một cảm giác bằng bưu thiếp, hay ngồi nghỉ rồi nói chuyện?",
      "Cảm giác khó viết hơn tên địa điểm nhỉ."
    ],
    "creative": [
      "Chọn một bố cục hay một bảng màu thôi nhé?",
      "Ừ. Không cần biến tấm giấy thành bài giới thiệu đầy đủ."
    ],
    "postcards": [
      [
        "Ngọc thử đặt phần hình lệch sang một phía.",
        "Mình muốn chừa chỗ viết một câu còn đang nghĩ.",
        "Thế phần hình cứ dừng ở đây."
      ],
      [
        "Ngọc chọn tông tím rồi nhìn Duy, chờ phản ứng.",
        "Hôm nay mình thích màu này, chỉ vậy thôi.",
        "Vậy cứ giữ nó như cảm nhận của riêng cậu."
      ]
    ],
    "rest": [
      "Mình để sổ sang bên một lát nhé?",
      "Ừ, câu hỏi không cần được trả lời hết trong hôm nay."
    ],
    "quiet": [
      "Ngọc gấp sổ, ngồi cạnh Duy.",
      "Không viết gì mà vẫn thấy nhớ được.",
      "Lát nữa mở lại, cậu thử xem còn điều gì ở lại."
    ],
    "chat": [
      "Mình còn một câu hỏi, nhưng không phải hỏi về tư liệu.",
      "Hỏi đi. Lần này mình sẽ trả lời bằng điều mình nhớ."
    ],
    "endings": [
      "Ngọc chừa lại một góc giấy cho câu chưa viết xong. Duy hẹn sẽ đọc khi bạn muốn kể tiếp.",
      "Tông tím là lựa chọn riêng của Ngọc trong ngày ấy. Duy nhớ cả lúc bạn chọn mà không cần giải thích.",
      "Cuốn sổ khép lại trước khi đầy trang. Hai người giữ một khoảng nghỉ làm dấu kết ngày.",
      "Ngọc ghi rằng một ngày tìm hiểu Huế cũng có thể là một ngày biết lắng nghe người đi cùng."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "lunchPrompt"
    ]
  },
  "da-nang": {
    "cast": [
      "Nam",
      "Hà"
    ],
    "premise": "Bạn là Nam. Hà vừa đến Đà Nẵng đã gửi một danh sách điểm muốn ghé. Gặp nhau rồi, hai người lại quyết định chọn theo điều đang tò mò nhất.",
    "intro": [
      "Mình chọn chặng sáng trước thôi. Chiều tính tiếp.",
      "Nghe như Nam đang rủ mình bớt tham, nhưng mình đồng ý."
    ],
    "morningPrompt": [
      "Mỹ Khê hay Ngũ Hành Sơn?",
      "Một phía để ngắm, một phía để hỏi. Khó chọn thật."
    ],
    "morning": [
      [
        "Hà cầm điện thoại trước biển Mỹ Khê rồi quay sang Nam.",
        "Mình chụp xong mà cứ muốn chụp lại.",
        "Thử cất máy đi một đoạn xem còn muốn chụp điều gì."
      ],
      [
        "Hà chỉ vào nét núi trong ảnh Ngũ Hành Sơn. Nam kéo phần ghi chú lại gần.",
        "Chỗ này mình không muốn đoán theo hình đâu.",
        "Ừ, đọc phần giới thiệu trước rồi hỏi tiếp."
      ]
    ],
    "memories": [
      "đoạn ngắm Mỹ Khê không qua màn hình điện thoại",
      "nét núi Ngũ Hành Sơn làm mình dừng lại đọc ghi chú",
      "bữa mì Quảng hai đứa nói mãi chưa hết chuyện",
      "cuốn bánh tráng thịt heo đầu tiên hơi lệch của mình"
    ],
    "lunchPrompt": [
      "Nam ơi, mình chuyển sang khám phá bữa trưa được chưa?",
      "Được. Phần này mình cũng đang chờ."
    ],
    "lunch": [
      [
        "Hà nhìn phần mì Quảng rồi hỏi Nam điều bạn thích ở bữa ăn này.",
        "Mình đang cố nghĩ một câu nhận xét thật đúng.",
        "Cứ ăn xem cậu thấy thế nào. Mình muốn nghe cảm nhận của Hà cơ."
      ],
      [
        "Hà cuốn phần bánh đầu tiên, nhìn mép cuốn chưa gọn rồi bật cười.",
        "Đừng nhìn tay mình nhé.",
        "Mình đang nhìn cuốn của mình, cũng chưa khá hơn đâu."
      ]
    ],
    "afternoon": [
      "Buổi chiều mình làm bưu thiếp hay nghỉ chân?",
      "Chỉ cần đừng biến bưu thiếp thành bài thi mỹ thuật."
    ],
    "creative": [
      "Một hình ảnh hay một bảng màu sẽ kể được hôm nay nhỉ?",
      "Cậu chọn cái muốn giữ. Mình giúp chừa chỗ viết lời nhắn."
    ],
    "postcards": [
      [
        "Hà đặt ảnh chặng sáng bên tờ giấy ngang.",
        "Mình muốn bố cục rộng thế này.",
        "Vậy giữ một chi tiết làm điểm bắt đầu thôi."
      ],
      [
        "Hà thử xếp những lớp màu cạnh nhau.",
        "Không giống ảnh hoàn toàn nhưng lại giống cảm giác của mình.",
        "Thế thì giữ cảm giác ấy."
      ]
    ],
    "rest": [
      "Danh sách cũ có mục nghỉ chân không nhỉ?",
      "Bây giờ có rồi. Mình tự thêm cho hai đứa."
    ],
    "quiet": [
      "Hà cất danh sách vào túi và tựa lưng.",
      "Hôm nay mình đi ít hơn dự tính.",
      "Nhưng cậu có muốn đổi đoạn nghỉ này lấy thêm một điểm không?"
    ],
    "chat": [
      "Mình nhớ một chi tiết chắc Nam không để ý.",
      "Kể đi. Mình muốn biết cùng một ngày cậu nhìn thấy gì khác."
    ],
    "endings": [
      "Hà giữ bố cục thoáng bên ảnh chặng sáng. Nam viết tên hai người ở góc còn lại.",
      "Những lớp màu không chép nguyên bức ảnh. Chúng giữ cách Hà và Nam cùng nhìn ngày hôm ấy.",
      "Hai người bỏ lại một vài điểm trong danh sách để giữ khoảng nghỉ cuối ngày. Không ai tiếc.",
      "Hà ghi rằng đi cùng Nam khiến một lịch trình ngắn có nhiều chuyện hơn mình tưởng."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative",
      "lunchPrompt"
    ]
  },
  "quang-nam": {
    "cast": [
      "Phúc",
      "Trang"
    ],
    "premise": "Bạn là Phúc. Trang đến Hội An và nhờ bạn dẫn đi, nhưng dặn trước rằng mình hay dừng lại vì những chi tiết rất nhỏ.",
    "intro": [
      "Mình sẽ không giục. Nhưng lúc mình dừng thì Trang cũng phải đợi nhé.",
      "Thỏa thuận công bằng. Hôm nay hai đứa cùng đi chậm."
    ],
    "morningPrompt": [
      "Mình ngắm phố cổ hay nhìn Hội An từ phía sông Thu Bồn?",
      "Hôm nay mình muốn thử chọn góc nhìn trước khi chọn ảnh."
    ],
    "morning": [
      [
        "Trang đứng nép sang một bên để nhìn dãy nhà, không chắn lối người qua lại.",
        "Phúc nhìn cái gì đầu tiên?",
        "Một khung cửa. Còn Trang?"
      ],
      [
        "Trang nhìn cảnh sông Thu Bồn rồi nhờ Phúc đứng cạnh thêm chút nữa.",
        "Mình muốn giữ nguyên góc nhìn này một lúc.",
        "Ừ, không phải thấy cảnh là phải chụp ngay."
      ]
    ],
    "memories": [
      "khung cửa nhỏ trong dãy nhà phố cổ",
      "góc nhìn bên sông Thu Bồn mà hai đứa đứng ngắm thêm",
      "phần cao lầu khiến mình tạm ngừng kể chuyện",
      "bữa cơm gà mình nếm rồi tự điều chỉnh cho vừa miệng"
    ],
    "lunchPrompt": [
      "Trang dừng nhiều quá, giờ mình phải dừng ăn rồi.",
      "Lần này mình sẽ không bắt Phúc đợi đâu."
    ],
    "lunch": [
      [
        "Trang nhìn phần cao lầu rồi định kể tiếp câu chuyện về chặng sáng.",
        "Mình nói nốt một câu thôi.",
        "Ừ. Rồi mình cùng ăn khi còn muốn ăn nhé."
      ],
      [
        "Phúc đặt phần cơm gà xuống, đẩy gia vị về giữa bàn.",
        "Mình cứ ăn giống Phúc có được không?",
        "Thử một ít trước đi. Trang thích vị nào thì giữ vị ấy."
      ]
    ],
    "afternoon": [
      "Còn một tấm bưu thiếp trống. Hay mình cứ để trống và ngồi nghỉ?",
      "Để mình chọn xem hôm nay muốn nhớ bằng cách nào."
    ],
    "creative": [
      "Mình sợ vẽ nhiều sẽ che mất điều mình thích nhất.",
      "Thế chọn một hướng thôi: bố cục hoặc màu."
    ],
    "postcards": [
      [
        "Trang lấy một góc của ảnh chặng sáng làm gợi ý.",
        "Phần còn lại mình chừa để viết.",
        "Cậu chọn được điều muốn giữ rồi đấy."
      ],
      [
        "Trang thử một mảng vàng ấm cạnh ảnh.",
        "Hôm nay mình muốn dùng ít màu thôi.",
        "Vậy đừng thêm chỉ vì giấy còn rộng."
      ]
    ],
    "rest": [
      "Phúc có thấy mình dừng nhiều quá không?",
      "Có. Nhưng mình đã hứa sẽ đợi mà."
    ],
    "quiet": [
      "Trang khép sổ, không chọn thêm việc gì nữa.",
      "Mình thích đoạn chẳng cần quyết định này.",
      "Vậy cứ để nó dài thêm một chút."
    ],
    "chat": [
      "Hóa ra cùng đứng một chỗ mà hai đứa nhớ khác nhau.",
      "Trang kể góc của cậu trước đi, mình kể góc của mình sau."
    ],
    "endings": [
      "Trang chỉ giữ một phần hình trên tờ bưu thiếp. Phúc nhận ra đó là chi tiết bạn đã dừng lại lâu nhất.",
      "Mảng vàng ấm khép lại buổi chiều. Trang giữ nó như một lựa chọn của hôm nay, không cố giải thích thay cả Hội An.",
      "Phúc đã đợi Trang nhiều lần, và cuối ngày hai người cùng chọn ngồi lại. Lời hứa nhỏ được giữ trọn.",
      "Trang viết rằng Hội An hôm nay có hai góc nhìn, và mình được nghe cả góc của Phúc."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "khanh-hoa": {
    "cast": [
      "Hải",
      "Yến"
    ],
    "premise": "Bạn là Hải. Yến đến Nha Trang với mong muốn gửi một lời nhắn về cho em, nhưng chưa biết nên kể điều gì ngoài việc mình đang đi chơi.",
    "intro": [
      "Cứ đi cùng mình trước. Tối hãy chọn chuyện để kể.",
      "Hải đừng kể hộ hết nhé, cho mình tự tìm nữa."
    ],
    "morningPrompt": [
      "Ngắm biển Nha Trang, hay tìm hiểu tháp Po Nagar?",
      "Mình muốn chọn điều khiến mình phải nhìn kỹ hơn."
    ],
    "morning": [
      [
        "Yến đứng nhìn biển, đợi Hải bước trở lại cạnh mình.",
        "Đứng đây cùng mình một lát được không?",
        "Được. Mình cũng chưa muốn đi tiếp."
      ],
      [
        "Hai người mở ảnh và ghi chú về Po Nagar. Yến chỉ vào một chi tiết kiến trúc.",
        "Hải có biết chi tiết này không?",
        "Mình cùng đọc thêm nhé. Chưa biết thì không cần đoán."
      ]
    ],
    "memories": [
      "đoạn hai đứa đứng ngắm biển Nha Trang mà chưa vội đi tiếp",
      "chi tiết ở Po Nagar khiến mình muốn đọc thêm",
      "bát bún chả cá mình thử trước khi thêm gia vị",
      "phần nem nướng chia cùng Hải trong bữa trưa"
    ],
    "lunchPrompt": [
      "Lời nhắn về nhà có phần ăn trưa không?",
      "Có chứ. Nhưng trước tiên cho mình được ăn đã."
    ],
    "lunch": [
      [
        "Yến nếm một chút bún chả cá rồi nhìn Hải, chưa vội thêm gì.",
        "Mình muốn nhớ vị lúc chưa nêm đã.",
        "Ừ. Rồi cậu chọn phần nào vừa miệng mình."
      ],
      [
        "Hải kéo phần nem nướng vào giữa để hai người cùng dùng.",
        "Hôm nay mình cứ thấy muốn chia món với người đi cùng.",
        "Vậy mình ngồi gần thêm một chút cho dễ lấy."
      ]
    ],
    "afternoon": [
      "Mình làm một ý tưởng bưu thiếp, hay nghỉ rồi nghĩ lời nhắn?",
      "Hình như giờ mình đã có nhiều hơn một điều để kể."
    ],
    "creative": [
      "Chọn hình hay màu sẽ dễ gửi cảm giác hơn?",
      "Cái nào làm Yến muốn kể tiếp thì chọn cái ấy."
    ],
    "postcards": [
      [
        "Yến đặt ảnh chặng sáng cạnh tờ giấy, chừa một khoảng rộng.",
        "Mình dành chỗ này cho lời nhắn về nhà.",
        "Vậy phần hình chỉ cần gợi một điều thôi."
      ],
      [
        "Yến chọn vài mảng màu rồi nhờ Hải xem cùng.",
        "Mình không định chép nguyên cảnh đâu.",
        "Ừ. Cứ giữ cách cậu nhớ nó."
      ]
    ],
    "rest": [
      "Để mình nghĩ lời nhắn mà không phải nhìn giấy nhé.",
      "Mình ngồi đây. Nghĩ xong thì kể mình nghe."
    ],
    "quiet": [
      "Yến cất điện thoại nhưng vẫn ngồi cạnh Hải.",
      "Chưa viết mà mình thấy đã có lời rồi.",
      "Vậy cứ giữ nó thêm một lúc."
    ],
    "chat": [
      "Mình nói thử một câu nhé, nếu dài quá thì nhắc.",
      "Cứ kể đủ trước đã. Không phải lời nhắn nào cũng cần thật ngắn."
    ],
    "endings": [
      "Yến chừa chỗ trống cạnh ảnh để gửi lời nhắn về nhà. Hải ngồi nghe đến khi câu cuối cùng được chọn.",
      "Những mảng màu là cách Yến giữ cảm giác của ngày hôm ấy. Hải nhớ cả lúc bạn nhờ mình nhìn cùng.",
      "Lời nhắn chưa gửi ngay, nhưng Yến không còn lo mình chẳng có chuyện để kể.",
      "Yến ghi rằng có Hải ngồi nghe giúp mình tìm được câu muốn gửi về nhà."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "lam-dong": {
    "cast": [
      "Sơn",
      "Thảo"
    ],
    "premise": "Bạn là Sơn. Thảo nhờ bạn dẫn khám phá một ngày ở Đà Lạt, nhưng không muốn biến chuyến đi thành cuộc đua tìm đủ ảnh đẹp.",
    "intro": [
      "Mình đi vừa sức thôi. Thảo muốn dừng thì cứ nói.",
      "Còn Sơn muốn dừng ăn thì mình cũng sẽ chờ."
    ],
    "morningPrompt": [
      "Câu chuyện chợ Đà Lạt hay chùa Linh Sơn?",
      "Mình chọn một chặng để nhìn cho kỹ nhé."
    ],
    "morning": [
      [
        "Thảo định chụp một quầy hàng rồi dừng tay khi Sơn khẽ nhắc.",
        "Mình hỏi cô chú trước đã nhé?",
        "Ừ, rồi đứng gọn sang một bên để mọi người còn đi."
      ],
      [
        "Ở chặng tìm hiểu Linh Sơn, Thảo hạ giọng khi quay sang Sơn.",
        "Mình muốn đọc thêm phần giới thiệu rồi nhìn lại chi tiết này.",
        "Cứ đọc đi. Mình chờ bên cạnh."
      ]
    ],
    "memories": [
      "lúc hai đứa hỏi trước khi chụp và đứng gọn bên chợ Đà Lạt",
      "khoảng dừng đọc tư liệu về chùa Linh Sơn",
      "phần bánh căn mình nếm giữa câu chuyện dở dang",
      "bữa bánh mì xíu mại khiến hai đứa quên nhìn điện thoại"
    ],
    "lunchPrompt": [
      "Đến lượt mình xin dừng ăn rồi đây.",
      "Mình đã hứa sẽ chờ. Nhưng chọn món cùng mình đã."
    ],
    "lunch": [
      [
        "Thảo ngồi trước phần bánh căn, nhắc lại một chi tiết Sơn đã bỏ lỡ buổi sáng.",
        "Cậu thật sự không thấy à?",
        "Không. Kể lại cho mình nghe đi."
      ],
      [
        "Hai người ngồi xuống bên phần bánh mì xíu mại. Thảo để điện thoại vào túi.",
        "Bữa này mình không cần tìm góc chụp nữa.",
        "Vậy mình cùng ăn trước khi câu chuyện lại dài ra."
      ]
    ],
    "afternoon": [
      "Chiều làm bưu thiếp hay nghỉ chân?",
      "Mình chọn điều nào cũng không phải để đăng ngay lên mạng nhé."
    ],
    "creative": [
      "Mình bắt đầu từ bố cục hay màu?",
      "Thử thứ khiến cậu nhớ chặng sáng, không cần nghĩ người khác sẽ thích gì."
    ],
    "postcards": [
      [
        "Thảo chọn một góc ảnh làm điểm bắt đầu rồi để phần giấy còn lại thoáng.",
        "Để ít hình mà mình thấy nhẹ hơn.",
        "Vậy cứ dừng ở mức cậu thích."
      ],
      [
        "Thảo đặt vài mảng màu cạnh ảnh chặng sáng.",
        "Mình muốn có chỗ viết, nên chỉ lấy ít màu thôi.",
        "Được. Tờ giấy này là của hai đứa mà."
      ]
    ],
    "rest": [
      "Sơn có định rủ mình đi thêm chỗ nào không?",
      "Có thể để lần sau. Bây giờ nghỉ đã."
    ],
    "quiet": [
      "Thảo tựa lưng, không mở điện thoại ra nữa.",
      "Mình thích được ngồi mà không cần tìm một góc đẹp.",
      "Ngồi thoải mái trước, góc đẹp để sau."
    ],
    "chat": [
      "Có một chi tiết Sơn bỏ lỡ, mình vẫn muốn kể nốt.",
      "Mình đang nghe. Hôm nay cậu đã chỉ mình nhìn thêm được mấy thứ rồi."
    ],
    "endings": [
      "Thảo chọn một bố cục thưa, dành chỗ cho lời viết tay. Sơn không hỏi tấm này có được đăng không.",
      "Vài màu cạnh bức ảnh là đủ cho buổi chiều. Thảo không phải chọn điều người khác sẽ thích.",
      "Sơn và Thảo khép lại ngày bằng một khoảng nghỉ không cần lên hình.",
      "Thảo ghi rằng người dẫn đường cũng có thể khám phá thêm, khi chịu nghe người đi cùng kể lại."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "ho-chi-minh": {
    "cast": [
      "Quân",
      "Nhi"
    ],
    "premise": "Bạn là Quân. Nhi nhờ bạn dẫn đi một ngày ở Thành phố Hồ Chí Minh, mang theo cuốn sổ nhỏ để giữ lại những điều dễ bị nhịp đi nhanh làm trôi mất.",
    "intro": [
      "Hôm nay mình không chạy cho kịp danh sách nào nhé.",
      "Được. Quân đi trước, nhưng nhớ quay lại đợi mình."
    ],
    "morningPrompt": [
      "Bưu điện Trung tâm hay chợ Bình Tây?",
      "Mình muốn bắt đầu ở nơi khiến mình nảy ra một câu hỏi."
    ],
    "morning": [
      [
        "Nhi nhìn ảnh Bưu điện Trung tâm, dừng ở một đường nét trên mặt tiền.",
        "Nếu chỉ chọn một chi tiết để nhớ, Quân chọn gì?",
        "Cậu chọn trước đi. Mình muốn biết mắt cậu dừng ở đâu."
      ],
      [
        "Nhi xem cảnh chợ Bình Tây rồi đứng gọn bên cạnh Quân để đọc phần giới thiệu.",
        "Mình hay chỉ nhớ một cái chợ đông, rồi quên mọi chi tiết.",
        "Lần này thử tìm một chi tiết trước khi gọi nó là đông nhé."
      ]
    ],
    "memories": [
      "đường nét trên mặt tiền Bưu điện Trung tâm mình dừng lại ngắm",
      "chi tiết ở chợ Bình Tây mà mình để ý thay vì chỉ nhìn đám đông",
      "bữa cơm tấm hai đứa vừa ăn vừa kể chuyện",
      "ổ bánh mì mình dành thời gian ngồi ăn cùng Quân"
    ],
    "lunchPrompt": [
      "Mình đã quay lại đợi Nhi đủ chưa?",
      "Đủ rồi. Giờ đợi mình chọn món trưa nữa thôi."
    ],
    "lunch": [
      [
        "Nhi đặt sổ xuống cạnh phần cơm tấm, nghe Quân nhắc chuyện vừa xem lúc sáng.",
        "Quân có thấy mình hỏi nhiều không?",
        "Có. Nhưng nhờ vậy mình cũng phải nhìn kỹ hơn."
      ],
      [
        "Hai người ngồi nghỉ cùng phần bánh mì, không tranh thủ vừa ăn vừa đi.",
        "Ngồi thế này mình mới nghe hết câu Quân kể.",
        "Thế hôm nay mình kể chậm lại."
      ]
    ],
    "afternoon": [
      "Mình làm một tấm bưu thiếp hay ngồi nghỉ rồi nói chuyện?",
      "Mình vẫn muốn được chọn chậm, dù thành phố chẳng dừng lại."
    ],
    "creative": [
      "Một bố cục hay bảng màu sẽ hợp với trang giấy này?",
      "Chọn thứ Nhi muốn giữ, không cần gom cả thành phố."
    ],
    "postcards": [
      [
        "Nhi lấy một chi tiết từ ảnh chặng sáng rồi chừa phần giấy bên cạnh.",
        "Chỗ trống này để viết tên người mình muốn gửi.",
        "Nhớ để mình đọc lời nhắn trước khi gấp lại nhé."
      ],
      [
        "Nhi thử hai mảng màu cạnh nhau, khác cách Quân vừa gợi ý.",
        "Mình thích cách này hơn, có được không?",
        "Cứ giữ nó. Mình đâu phải người chấm bài."
      ]
    ],
    "rest": [
      "Mình có đang chậm quá không?",
      "Không. Hôm nay mình hẹn đi cùng Nhi mà."
    ],
    "quiet": [
      "Quân và Nhi ngồi cạnh nhau, để tiếng trò chuyện lắng xuống.",
      "Thì ra không nói vẫn thấy đang đi chơi cùng nhau.",
      "Ừ. Mình không cần lấp hết mọi khoảng nghỉ."
    ],
    "chat": [
      "Quân còn nhớ câu hỏi đầu tiên mình hỏi không?",
      "Có, nhưng mình thích câu cậu sắp kể hơn. Nói tiếp đi."
    ],
    "endings": [
      "Nhi chừa chỗ viết tên người nhận bên hình ảnh đã chọn. Quân chờ bạn nghĩ xong lời nhắn.",
      "Cách phối màu Nhi giữ khác gợi ý ban đầu. Quân vui vì bạn không cần chọn giống mình.",
      "Hai người không chạy theo nhịp ngoài phố nữa. Một khoảng ngồi yên cũng nằm trong ngày đã chọn.",
      "Nhi ghi rằng điều mình nhớ không chỉ là thành phố, mà còn là Quân đã chịu quay lại đợi."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  },
  "can-tho": {
    "cast": [
      "Tín",
      "Hân"
    ],
    "premise": "Bạn là Tín. Hân đến Cần Thơ với cuốn sổ mới, hứa sẽ tự viết một trang về chuyến đi thay vì chỉ gửi ảnh về nhà.",
    "intro": [
      "Hân định bắt đầu trang đầu bằng gì?",
      "Chưa biết. Tín dẫn mình đi một ngày rồi hỏi lại nhé."
    ],
    "morningPrompt": [
      "Tư liệu chợ nổi Cái Răng hay câu chuyện nhà cổ Bình Thủy?",
      "Mình muốn chọn một điều để hiểu, chứ không chỉ nhớ tên."
    ],
    "morning": [
      [
        "Hân phóng to một góc ảnh trong tư liệu Cái Răng rồi gọi Tín nhìn cùng.",
        "Người trong ảnh đang làm gì nhỉ?",
        "Mình đọc phần giới thiệu trước đã. Không phải nhìn ảnh là đoán được hết."
      ],
      [
        "Hai người mở phần giới thiệu nhà cổ Bình Thủy. Hân vừa nhìn vừa kể điều mình liên tưởng.",
        "Mình đang đoán hơi nhiều phải không?",
        "Liên tưởng thì được. Còn điều mình kể là dữ kiện thì đọc lại nguồn nhé."
      ]
    ],
    "memories": [
      "câu hỏi về đời sống trong tư liệu chợ nổi Cái Răng",
      "lần mình đọc tư liệu nhà cổ Bình Thủy trước khi tự đoán",
      "phần hủ tiếu khiến mình gấp sổ lại để ăn",
      "phần bánh xèo hai đứa chia nhau giữa câu chuyện"
    ],
    "lunchPrompt": [
      "Trang đầu đã có câu nào chưa?",
      "Có một câu: mình đói rồi. Tín giúp mình viết tiếp bằng bữa trưa đi."
    ],
    "lunch": [
      [
        "Hân đặt cuốn sổ xuống cạnh phần hủ tiếu, chưa biết nên ghi hay ăn trước.",
        "Lát nữa mình quên tên món thì sao?",
        "Mình nhắc. Bây giờ cùng ăn đã."
      ],
      [
        "Tín chia phần bánh xèo, chờ Hân kể nốt câu chuyện lúc sáng.",
        "Mình nói nhiều quá, Tín ăn trước đi.",
        "Mình nghe được mà. Nhưng cậu cũng ăn cùng mình nhé."
      ]
    ],
    "afternoon": [
      "Mình thử một ý tưởng bưu thiếp, hay nghỉ để nghĩ câu kết?",
      "Giờ mình thấy một trang giấy có khi không đủ."
    ],
    "creative": [
      "Hình ảnh hay bảng màu sẽ giúp mình bắt đầu?",
      "Chọn một thứ thôi, rồi dành chỗ cho câu của Hân."
    ],
    "postcards": [
      [
        "Hân chọn một góc của ảnh chặng sáng làm gợi ý.",
        "Mình chừa chỗ này để ghi điều còn muốn hỏi.",
        "Vậy tấm bưu thiếp còn có cả lời hẹn lần sau."
      ],
      [
        "Hân đặt mấy mảng xanh cạnh ảnh rồi bớt đi một màu.",
        "Nhìn nhẹ hơn rồi. Mình muốn giữ như vậy.",
        "Ừ, mình không cần dùng hết những màu có trên bàn."
      ]
    ],
    "rest": [
      "Tín cho mình ngồi nghĩ một lúc nhé?",
      "Cứ ngồi. Không ai thu cuốn sổ cuối giờ đâu."
    ],
    "quiet": [
      "Hân gấp sổ, nhìn quanh rồi ngồi yên cạnh Tín.",
      "Để lát nữa viết. Bây giờ mình muốn nhìn thêm.",
      "Ừ. Mình vẫn còn ở đây cùng cậu."
    ],
    "chat": [
      "Mình đã nghĩ ra câu mở đầu rồi.",
      "Đọc thử đi. Mình sẽ kể thêm phần mình muốn nhớ."
    ],
    "endings": [
      "Hân chừa một góc bưu thiếp cho câu hỏi chưa hết. Tín nhận ra ngày hôm nay vẫn có thể mở sang lần gặp sau.",
      "Mấy mảng xanh vừa đủ cho ý tưởng bưu thiếp. Hân để dành phần giấy còn lại cho lời kể của mình.",
      "Trang sổ chưa kín nhưng Hân không vội viết thêm. Hai người giữ khoảng nhìn ngắm cuối ngày cho riêng mình.",
      "Hân viết rằng đến Cần Thơ với một cuốn sổ trống không có gì đáng lo, nếu có người chịu đi và nghe cùng."
    ],
    "visitorFirst": [
      "rest",
      "chat",
      "creative"
    ]
  }
};
