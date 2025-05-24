import { updateExcelRow } from './excel.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AizaSyAxfXZ7fOgO4ZxffXp4fsAjAcTmMQrwuQ",
      authDomain: "fitgirlviki.firebaseapp.com",
      projectId: "fitgirlviki",
      storageBucket: "fitgirlviki.firebasestorage.app",
      messagingSenderId: "207468197936",
      appId: "1:207468197936:web:70ea3baa845e403722555f5"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

function updatePreview() {
  const customerName = document.getElementById('customerName').value;
  const productName = window.getFormattedProductName();
  const deliveryDate = document.getElementById('deliveryDate').value;
  const formattedDate = deliveryDate ? new Date(deliveryDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  const previewText = `'핏걸비키' 주문완료 안내
${customerName}님의 반짝이는 무대를 책임질 주문이 접수되었습니다(뽀뽀)

■ 주문상품: ${productName}
■ 배송예정일: ${formattedDate}

신속히 발송해드릴 예정입니다.
배송이 시작되면 다시 안내드릴게요! 

문의사항 있으시면 언제든지 연락주세요. 
감사합니다!(하트)`;

  document.getElementById('preview').textContent = previewText;
}

// Update preview when inputs change
['customerName', 'earrings', 'deliveryDate'].forEach(id => {
  document.getElementById(id).addEventListener('change', updatePreview);
  document.getElementById(id).addEventListener('input', updatePreview);
});

// Add event listeners for all checkboxes
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', updatePreview);
});

async function sendKakaoMessage() {
  const customerName = document.getElementById('customerName').value;
  const phone = document.getElementById('phone').value;
  const productName = window.getFormattedProductName();
  const deliveryDate = document.getElementById('deliveryDate').value;
  const formattedDate = new Date(deliveryDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const response = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'apikey': 'hqupt87di966drllinn2l96kb02hixeq',
      'userid': 'fitgirlviki',
      'senderkey': 'bf70d26201780aa1e02231f2b45c00a7f6421bbc',
      'tpl_code': 'TZ_4574',
      'sender': '01086871992',
      'receiver_1': phone,
      'subject_1': '주문완료안내',
      'message_1': `'핏걸비키' 주문완료 안내
${customerName}님의 반짝이는 무대를 책임질 주문이 접수되었습니다(뽀뽀)

■ 주문상품: ${window.getFormattedProductName()}
■ 배송예정일: ${formattedDate}

신속히 발송해드릴 예정입니다.
배송이 시작되면 다시 안내드릴게요! 

문의사항 있으시면 언제든지 연락주세요. 
감사합니다!(하트)

`,
      'button_1': `{
        "button": [
          {
            "name": "채널추가",
            "linkType": "AC",
            "linkTypeName": "채널 추가"
          },
          {
            "name": "핏걸비키 바로가기",
            "linkType": "WL",
            "linkTypeName": "웹링크",
            "linkPc": "https://m.smartstore.naver.com/fitgirlviki",
            "linkMo": "https://m.smartstore.naver.com/fitgirlviki"
          },
          {
            "name": "상담톡 바로가기",
            "linkType": "WL",
            "linkTypeName": "웹링크",
            "linkPc": "https://pf.kakao.com/_xgxfixbn/chat",
            "linkMo": "https://pf.kakao.com/_xgxfixbn/chat"
          }
        ]
      }`,
      'failover': 'N'
    })
  });

  const data = await response.json();
  if (data.code === 0) {
    // Update Firebase with alimtalk timestamp
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const period = date.getHours() >= 12 ? 'PM' : 'AM';
    const currentTime = `${year}${month}${day}_${period} ${hour}:${minute}`;

    try {
      const { getFirestore, doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const db = getFirestore();
      const productDocRef = doc(db, "AdminSettings", "productlist");
      const productDocSnap = await getDoc(productDocRef);
      const collections = productDocSnap.exists() ? Object.values(productDocSnap.data().earing || {}) : [];

      console.log("📌 window.docId:", window.docId);

      for (const colName of collections) {
        const docRef = doc(db, colName, window.docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Generate timestamp in the format 'YYMMDD_AM/PM HH:MM'
          const date = new Date();
          const year = date.getFullYear().toString().slice(-2);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hour = String(date.getHours()).padStart(2, '0');
          const minute = String(date.getMinutes()).padStart(2, '0');
          const period = date.getHours() >= 12 ? 'PM' : 'AM';
          const formattedTime = `${year}${month}${day}_${period} ${hour}:${minute}`;

          await updateDoc(docRef, {
            "alimtalkOrder": formattedTime,
            "10_알림톡.1_주문완료안내": formattedTime
          });
          await updateExcelRow(window.docId, {
            "주문완료알림톡": formattedTime
          });
          break;
        }
      }
    } catch (error) {
      console.error('Firebase 업데이트 오류:', error);
    }

    window.dispatchEvent(new Event('kakaoSendSuccess'));
    // Disable kakao button after successful send
    const kakaoButton = document.getElementById('sendKakao');
    kakaoButton.disabled = true;
    kakaoButton.textContent = '발송 완료';
    kakaoButton.style.backgroundColor = '#cccccc';
    kakaoButton.style.color = '#666666';
  } else {
    throw new Error(data.message);
  }
}

document.getElementById('sendKakao').addEventListener('click', () => {
  if (confirm('알림톡을 발송하시겠습니까?')) {
    sendKakaoMessage().catch(error => {
      console.error('알림톡 발송 오류:', error);
      alert('알림톡 발송에 실패했습니다. 다시 시도해주세요.');
    });
  }
});