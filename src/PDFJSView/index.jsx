import PDFJS from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, Space, Button, Pagination } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import axios from '../../../../service/www';
import { useLocation, useNavigate } from 'react-router-dom';
import { TextLayerBuilder } from 'pdfjs-dist/lib/web/text_layer_builder';
import {
  MARK_COLORS,
  MARK_CATEGORIES
} from './constants';
import {
  baidufanyi
} from '../../../../service';
import './index.scss';

PDFJS.workerSrc = workerSrc;
let pdfDoc;

function PDFJSView({
  data,
  setClickedBoxContent
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [totalNum, setTotalNum] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isRendering, setIsRendering] = useState(false);

  // const [file, setFile] = useState();
  const pdfContainer = useRef(null)

  const drawRect = (ctx, Xmin, Ymin, Xmax, Ymax, type) => {
    // 不同内容给不同的颜色
    // const getColor = () => {
    //   switch (type) {
    //     case 'title':
    //       return 'red'
    //     case 'content': 
    //       return 'yellow'
    //     case 'gongshi':
    //       return 'blue'
    //     case 'pic':
    //       return 'green'
    //     default:
    //       return 'red'
    //   }
    // }

    ctx.save();
    ctx.moveTo(0, 0);
    ctx.beginPath();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = MARK_COLORS[(type?.toUpperCase())] || 'red'
    ctx.lineWidth = 1;
    ctx.rect(Xmin, Ymin, Xmax - Xmin, Ymax - Ymin);
    ctx.fill();
    ctx.restore();
  }

  const handleCanvasClick = async (e, textLayerDiv, currentScale) => {
    e.preventDefault()
    // e.stopImmediatePropagation();
    console.log(e)
    console.log(e.target?.parentElement?.parentElement?.id || e.target?.parentElement?.id)
    let clickX, clickY;
    // 取到当前target的偏移量，然后再取到相对于textLayer的偏移量，相加
    // 判断是否直接点击到不是文本的地方了
    if(e.target?.className === 'textLayer') {
      clickX = e.offsetX;
      clickY = e.offsetY;
    } else {
      let el = e.target;
      while(el.offsetParent?.className !== 'textLayer') {
        el = el.offsetParent
      }
      clickX = e.offsetX + el.offsetLeft;
      clickY = e.offsetY + el.offsetTop;
    }

    console.log(clickX, clickY)

    const pageNum = (e.target?.parentElement?.parentElement?.id || e.target?.parentElement?.id)?.split('-').pop();
    console.log(data.Object?.[pageNum - 1])
    // 取到当前点击页面的所有mark数据
    const pageBoxArr = data.Object?.map(pageBoxArr => {
      return pageBoxArr?.map(item => {
        return {
          ...item,
          bbox: item.bbox?.map((pos, idx) => {
            if(idx <= 1) {
              return pos * currentScale - 10
            } else {
              return pos * currentScale + 10
            }
          })
        }
      })
    })?.filter((item, index) => index + 1 === Number(pageNum))[0];
    console.log(pageBoxArr)
    // 判断点击的点是否在某一个mark方框内
    const clickedMark = pageBoxArr?.filter((item, index) => {
      if(item?.bbox?.[0] <= clickX && item?.bbox?.[2] >= clickX && item?.bbox?.[1] <= clickY && item?.bbox?.[3] >= clickY) {
        return true;
      }
      return false;
    })[0]
    // 获取点击mark内容
    // const markContent = clickedMark.text;
    console.log(clickedMark, currentScale, 'clickedMark')

    let textSpanArr = textLayerDiv.getElementsByTagName('span');
    let clickedMarkTextSpanArr = [];
    for(let i = 0; i< textSpanArr.length; i++) {
      let oSpan = textSpanArr[i];
      let left = parseInt(oSpan.style.left);
      let top = parseInt(oSpan.style.top);
      let width = parseInt(oSpan.getBoundingClientRect()?.width);
      let height = parseInt(oSpan.getBoundingClientRect()?.height);

      console.log(left, top, left + width, top + height, 'spanPos')

      if(left >= clickedMark?.bbox?.[0] &&
        top >= clickedMark?.bbox?.[1] && 
        left + width <= clickedMark?.bbox?.[2] && 
        top + height <= clickedMark?.bbox?.[3]
        ) {
        clickedMarkTextSpanArr.push(oSpan.innerText)
      }
    }
    console.log(clickedMarkTextSpanArr)

    setClickedBoxContent(await baidufanyi(clickedMarkTextSpanArr?.join(' ')))
    console.log(await baidufanyi(clickedMarkTextSpanArr?.join(' ')))
  }

  const renderPages = useCallback((currentPageNum, currentScale) => {
    setIsRendering(true);
    pdfDoc.getPage(currentPageNum).then((pageContent) => {
      // const markData = data.Object?.[currentPageNum - 1];
      // 创建div
      let pageDiv = document.createElement('div');
      pageDiv.setAttribute('id', 'pdf-page-' + currentPageNum)
      pageDiv.setAttribute('style', 'position: relative')
      pdfContainer.current && pdfContainer.current.appendChild(pageDiv)

      // let canvas = document.getElementById(`pdf-canvas-${currentPageNum}`);
      let canvas  = document.createElement('canvas');
      // canvas.setAttribute('id', `pdf-canvas-${currentPageNum}`);
      pageDiv.appendChild(canvas)

      let vp = pageContent.getViewport({ scale: 2 });
      let ctx = canvas.getContext('2d');
      let dpr = window.devicePixelRatio || 1;
      let bsr = ctx.webkitBackingStorePixelRatio || 
        ctx.mozBackingStorePixelRatio || 
        ctx.msBackingStorePixelRatio || 
        ctx.oBackingStorePixelRatio || 
        ctx.backingStorePixelRatio || 1;
      let ratio = dpr / bsr;
      let viewport = pageContent.getViewport({ scale: window.innerWidth / vp.width });
      canvas.width = viewport.width * ratio
      canvas.height = viewport.height * ratio
      canvas.style.width = viewport.width + 'px'
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      // data.rectData?.[currentPageNum - 1].forEach(item => {
      //   drawRect(ctx, ...item)
      // })
      // drawRect(ctx, 300, 300, 100, 50)
      const markData = data.Object?.[currentPageNum - 1]?.map(item => {
        return {
          ...item,
          bbox: item?.bbox?.map((pos, idx) => {
            // 让x，y的起点往左上移一点
            if(idx <= 1) {
              return pos * (window.innerWidth / vp.width) - 5
            } else {
              return pos * (window.innerWidth / vp.width) + 5
            }
          })
        }
      });

      let renderContext = {
        canvasContext: ctx,
        viewport: viewport
      }
      pageContent.render(renderContext)
        .promise.then(() => {
          return pageContent.getTextContent()
        }).then((textContent) => {
          const textLayerDiv = document.createElement('div')
          const canvas = document.querySelector('canvas')
          const textLayerDivWidth = canvas.width
          const textLayerDivHeight = canvas.height
          textLayerDiv.setAttribute('class', 'textLayer')
          textLayerDiv.setAttribute('style', `width: ${textLayerDivWidth}px; height: ${textLayerDivHeight}px;`)
          pageDiv.appendChild(textLayerDiv)
          let textLayer = new TextLayerBuilder({
            textLayerDiv: textLayerDiv,
            pageIndex: pageContent.pageIndex,
            viewport: viewport
          })
          textLayer.setTextContent(textContent)
          textLayer.render()
          // console.log(textLayerDiv, 'textLayerDiv')
          return textLayerDiv
        }).then((textLayerDiv) => {
          textLayerDiv.addEventListener('click', (e) => {
            handleCanvasClick(e, textLayerDiv, window.innerWidth / vp.width)
          }, false);
        }).then(() => {
          markData.forEach(item => {
            drawRect(ctx, item.bbox[0], item.bbox[1], item.bbox[2], item.bbox[3], MARK_CATEGORIES[item.category_id])
          })
        })

      pageDiv.appendChild(canvas);
      // pdfContainer.current && pdfContainer.current.appendChild(canvas) 
      
      setPageNum(currentPageNum)
      setScale(window.innerWidth / vp.width)
    })
    setIsRendering(false);
  }, [pdfContainer])

  const base64ToUint8Array = function(base64String) {
    try{
      let padding = '='.repeat((4 - base64String.length % 4) % 4);
      let base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
      let rawData = atob(base64);
      let outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }
    catch(e) {
        throw e;
    }
  }

  const waitFn = () => {
    let p = new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('100ms')
      }, 100)
    })
    return p;
  }

  useEffect(() => {
    if(data.PDF && !loading) {
      // const blob = new Blob([data.PDF], {
      //   type: 'application/pdf;charset=UTF-8'
      // })
      // console.log(data.PDF?.[0]?.pdf)
      PDFJS.getDocument(base64ToUint8Array(data.PDF?.[0]?.pdf)).promise.then(async (_pdfDoc) => {
        pdfDoc = _pdfDoc;
        setTotalNum(_pdfDoc.numPages);
        console.log(_pdfDoc.numPages);
        while(pdfContainer.current.firstChild) {
          pdfContainer.current.removeChild(pdfContainer.current.firstChild)
        }
        let i = 1;
        while(i <= _pdfDoc.numPages) {
          renderPages(i, scale);
          await waitFn();
          i++;
        }
      })
    }
  }, [renderPages, data, loading, scale])

  // const handleScaleAdd = () => {
  //   renderPages(pageNum, scale + 0.1);
  // }

  // const handleScaleSub = () => {
  //   if(scale > 0.5) {
  //     renderPages(pageNum, scale - 0.1);
  //   }
  // }

  // const pagination = {
  //   total: totalNum,
  //   current: pageNum,
  //   pageSize: 1,
  //   size: 'small',
  //   showSizeChanger: false,
  //   onChange: (current) => {
  //     renderPages(current, scale)
  //   }
  // }

  // const handleScroll = (e) => {
  //   // console.log(e.target?.scrollTop);
  //   let page = Math.ceil(e.target?.scrollTop / 1320);
  //   // console.log(Math.ceil(e.target?.scrollTop / 1320))
  //   navigate(`/project/1#pdf-canvas-${page}`)
  // }

  return (
    <div className='PDFJSView'>
      <div className='pdf-wrap'>
        <Spin spinning={loading}>
          <div className='pdf-container' ref={pdfContainer}>
            
          </div>
          <div className='pdf-control'>
            {/* <div className='pdf-control-page'>
              <Pagination {...pagination} />
            </div> */}
            {/* <div className='pdf-control-zoom'>
              <Space>
                <Button size="small" icon={<PlusOutlined />} onClick={handleScaleAdd} />
                <Button size="small" icon={<MinusOutlined />} onClick={handleScaleSub} />
              </Space>
            </div> */}
          </div>
        </Spin>
      </div>
    </div>
  )
}

export default PDFJSView;