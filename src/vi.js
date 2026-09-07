// Từ điển tiếng Việt cho UI và cho nhãn in trên rập.
//
// Định nghĩa số đo lấy nguyên văn từ freesewing.dev/reference/measurements — dịch sai
// định nghĩa là rập sai, nên `d` mô tả CÁCH ĐO chứ không chỉ dịch tên.

/** Số đo. unit: 'mm' trừ khi ghi khác. */
export const MEASUREMENTS = {
  biceps: { t: 'Vòng bắp tay', d: 'Chu vi chỗ to nhất của bắp tay' },
  bustSpan: { t: 'Khoảng cách hai đầu ngực', d: 'Từ đỉnh ngực bên này sang đỉnh ngực bên kia' },
  chest: { t: 'Vòng ngực', d: 'Chu vi chỗ nở nhất của ngực' },
  highBust: { t: 'Vòng ngực trên', d: 'Chu vi ngực đo sát ngay dưới hai nách' },
  hpsToBust: { t: 'Vai đến ngang ngực', d: 'Từ điểm cao nhất của vai (chỗ vai giáp cổ) xuống ngang đỉnh ngực' },
  hpsToWaistBack: { t: 'Vai đến eo (sau)', d: 'Từ điểm cao nhất của vai xuống ngang eo, đo ở lưng' },
  hpsToWaistFront: { t: 'Vai đến eo (trước)', d: 'Từ điểm cao nhất của vai xuống ngang eo, đo ở phía trước' },
  neck: { t: 'Vòng cổ', d: 'Chu vi chân cổ' },
  shoulderSlope: { t: 'Độ xuôi vai', d: 'Góc dốc xuống của đường vai', unit: '°' },
  shoulderToShoulder: { t: 'Rộng vai', d: 'Từ đầu vai bên này sang đầu vai bên kia, đo qua lưng' },
  shoulderToWrist: { t: 'Dài tay', d: 'Từ đầu vai xuống cổ tay' },
  underbust: { t: 'Vòng chân ngực', d: 'Chu vi đo ngay dưới bầu ngực' },
  waist: { t: 'Vòng eo', d: 'Chu vi eo, chỗ nhỏ nhất' },
  waistBack: { t: 'Nửa vòng eo sau', d: 'Phần vòng eo thuộc mặt sau (từ sườn này sang sườn kia, qua lưng)' },
  waistToArmpit: { t: 'Eo lên nách', d: 'Từ ngang eo lên tới nách' },
  waistToHips: { t: 'Eo xuống hông', d: 'Từ ngang eo xuống ngang hông, đo dọc sườn' },
  wrist: { t: 'Vòng cổ tay', d: 'Chu vi cổ tay' },

  // Chỉ ma-nơ-canh 3D dùng, block không cần
  ankle: { t: 'Vòng cổ chân', d: 'Chu vi cổ chân' },
  bustPointToUnderbust: { t: 'Đỉnh ngực xuống chân ngực', d: 'Từ đỉnh ngực xuống ngang chân ngực' },
  bustFront: { t: 'Nửa vòng ngực trước', d: 'Phần vòng ngực thuộc mặt trước' },
  crossSeam: { t: 'Vòng đáy', d: 'Từ eo trước, qua đũng, lên eo sau' },
  crossSeamFront: { t: 'Vòng đáy trước', d: 'Phần vòng đáy thuộc mặt trước' },
  crotchDepth: { t: 'Hạ đũng', d: 'Từ ngang eo xuống đũng, đo khi ngồi' },
  head: { t: 'Vòng đầu', d: 'Chu vi đầu chỗ lớn nhất' },
  heel: { t: 'Vòng gót', d: 'Chu vi vòng qua gót và mu bàn chân' },
  highBustFront: { t: 'Nửa vòng ngực trên trước', d: 'Phần vòng ngực trên thuộc mặt trước' },
  hips: { t: 'Vòng hông', d: 'Chu vi ngang xương hông' },
  inseam: { t: 'Dài giàng quần', d: 'Từ đũng xuống sàn, đo mặt trong chân' },
  knee: { t: 'Vòng gối', d: 'Chu vi đầu gối' },
  seat: { t: 'Vòng mông', d: 'Chu vi chỗ nở nhất của mông' },
  seatBack: { t: 'Nửa vòng mông sau', d: 'Phần vòng mông thuộc mặt sau' },
  shoulderToElbow: { t: 'Vai đến khuỷu', d: 'Từ đầu vai xuống khuỷu tay' },
  upperLeg: { t: 'Vòng đùi', d: 'Chu vi chỗ to nhất của đùi' },
  waistToFloor: { t: 'Eo xuống sàn', d: 'Từ ngang eo xuống sàn, đo dọc sườn' },
  waistToKnee: { t: 'Eo xuống gối', d: 'Từ ngang eo xuống đầu gối' },
  waistToSeat: { t: 'Eo xuống mông', d: 'Từ ngang eo xuống chỗ mông nở nhất' },
  waistToUnderbust: { t: 'Eo lên chân ngực', d: 'Từ ngang eo lên ngay dưới bầu ngực' },
  waistToUpperLeg: { t: 'Eo xuống đùi', d: 'Từ ngang eo xuống chỗ đùi to nhất' },
}

/** Chuỗi giao diện 3D. */
export const UI = {
  tabPattern: 'Rập',
  tabBody: 'Thân 3D',
  bodyMeasurements: 'Số đo thân',
  estimated: 'ước lượng',
  estimatedHint:
    'Số này do máy suy ra từ tỉ lệ cơ thể mẫu, không phải bạn đo. Sửa để dùng số thật.',
}

/**
 * Option nhóm "fit" — độ cử động (lượng vải dư để mặc vào cử động được).
 * Tất cả tính theo % của số đo tương ứng.
 */
export const OPTIONS = {
  chestEase: { t: 'Cử động vòng ngực', d: 'Lượng dư ở chỗ ngực nở nhất. Càng lớn áo càng rộng.' },
  waistEase: { t: 'Cử động vòng eo', d: 'Lượng dư ở vòng eo.' },
  bustSpanEase: { t: 'Cử động khoảng cách đầu ngực', d: 'Dư theo chiều ngang khi xác định vị trí đỉnh ngực.' },
  shoulderToShoulderEase: { t: 'Cử động rộng vai', d: 'Dư giữa hai đầu vai. Mặc định âm nhẹ vì Bella là block chuẩn công nghiệp.' },
  fullChestEaseReduction: { t: 'Giảm cử động quanh ngực', d: 'Bóp riêng phần quanh ngực cho ôm hơn, không đụng tới chỗ khác.' },
  bicepsEase: { t: 'Cử động bắp tay', d: 'Lượng dư ở bắp tay. Quá chặt là không giơ tay được.' },
  cuffEase: { t: 'Cử động cửa tay', d: 'Lượng dư ở cổ tay áo.' },
  collarEase: { t: 'Cử động vòng cổ', d: 'Lượng dư ở vòng cổ.' },
  shoulderEase: { t: 'Cử động vai', d: 'Lượng dư ở đường vai.' },
}

/**
 * Chuỗi được chèn vào SVG rập. Key là chuỗi gốc freesewing truyền qua hook insertText.
 * Dùng với @freesewing/plugin-i18n.
 */
export const SVG_STRINGS = {
  // tên mảnh rập
  back: 'Thân sau',
  front: 'Thân trước',
  frontSideDart: 'Thân trước (chiết sườn)',
  sleeve: 'Tay áo',
  base: 'Mảnh gốc',
  // chú thích của plugin-annotations
  'plugin-annotations:cut': 'Cắt',
  'plugin-annotations:cutOnFold': 'Cắt trên đường gấp',
  'plugin-annotations:cutOnFoldAndGrainline': 'Đường gấp / Canh sợi',
  'plugin-annotations:grainline': 'Canh sợi',
  'plugin-annotations:from': 'bằng',
  'plugin-annotations:mirrored': 'đối xứng',
  'plugin-annotations:onFold': 'trên đường gấp',
  'plugin-annotations:onBias': 'theo chiều xéo',
  'plugin-annotations:onFoldAndBias': 'trên đường gấp, theo chiều xéo',
  'plugin-annotations:sewTogether': 'May ráp lại',
  'plugin-annotations:fabric': 'vải chính',
  'plugin-annotations:contrast': 'vải phối',
  'plugin-annotations:lining': 'vải lót',
  'plugin-annotations:interfacing': 'dựng',
  'plugin-annotations:fusible': 'dựng dính (ép nhiệt)',
  'plugin-annotations:rigidInterfacing': 'dựng cứng',
  'plugin-annotations:facing': 'nẹp',
  'plugin-annotations:ribbing': 'bo',
  'plugin-annotations:canvas': 'vải canvas',
  'plugin-annotations:underside': 'vải mặt dưới',
  'plugin-annotations:specialty': 'vải đặc biệt (xem hướng dẫn rập)',
  'plugin-annotations:altFabric1': 'vải thay thế',
  'plugin-annotations:altFabric2': 'vải thay thế #2',
  'plugin-annotations:altFabric3': 'vải thay thế #3',
  'plugin-annotations:altFabric4': 'vải thay thế #4',
  'plugin-annotations:noName': 'Chưa đặt tên',
  'plugin-annotations:noVersion': 'Không rõ phiên bản',
  'plugin-annotations:theBlackOutsideOfThisBoxShouldMeasure':
    'Cạnh NGOÀI (đen) của ô này phải đo được đúng',
  'plugin-annotations:theWhiteInsideOfThisBoxShouldMeasure':
    'Cạnh TRONG (trắng) của ô này phải đo được đúng',
  'plugin-annotations:supportFreeSewingBecomeAPatron': 'Rập tạo bằng FreeSewing (MIT)',
  // tên block
  'Bella body block': 'Bella — block thân nữ',
  'Brian body block': 'Brian — block thân nam',
}

export const label = (dict, key) => dict[key]?.t ?? key
export const hint = (dict, key) => dict[key]?.d ?? ''
