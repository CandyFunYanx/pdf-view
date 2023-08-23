export const getPDFFormatResult = async (id) => {
  const res = await axios.get(`http://pdf-info.natapp1.cc/analyze_pdf/${id}`)
  // const data = jsonData;
  const {
    PdfImage,
    FormatPdfImage
  } = res.data;
  const len = PdfImage.length;
  const PdfData = [];
  for(let i = 0; i < len; i++) {
    PdfData.push([PdfImage[i]?.pdfimage, FormatPdfImage[i]?.formatpdfimage])
  }
  return {
    ...res.data,
    PdfData,
    // Object: res.data.Object?.map(pageMarkArr => {
    //   return pageMarkArr?.map(item => {
    //     return {
    //       ...item,
    //       bbox: item?.bbox?.map((pos, index) => {
    //         return pos * 1.5
    //       })
    //     }
    //   })
    // })
  }
}

// export const baidufanyi = async (text) => {
//   const url = 'http://api.fanyi.baidu.com/api/trans/vip/translate';
//   const appid = '20230606001702147';
//   const key = 'ocoqfA0JXtDMAxCUY4uR';
//   const salt = 'yanx';
//   let str = '' + appid + text + salt + key;
//   let sign = CryptoJS.MD5(CryptoJS.enc.Utf8.parse(str)).toString();

//   console.log(text)
//   console.log(str)

//   // const encode_q = encodeURI(text)

//   console.log(sign)

//   let translate_result= {};

//   await $.ajax({
//     url,
//     type: 'get',
//     dataType: 'jsonp',
//     data: {
//       q: text,
//       appid,
//       salt,
//       from: 'en',
//       to: 'zh',
//       sign
//     },
//     success: function (data) {
//       translate_result = data
//     }
//   })

//   return translate_result
// }