const  container = document.querySelector(".container");
const  chatsContainer = document.querySelector(".chats-container");
const  promptForm = document.querySelector(".prompt-form");
const promptInput=promptForm.querySelector(".prompt-input");
const fileInput=promptForm.querySelector("#file-input");
const fileUploadWrapper=promptForm.querySelector(".file-upload-wrapper");
const themeToggle=document.querySelector("#theme-toggle-btn");


//API setup
let typingInterval,controller;
let isStopped = false; 
let userData = {message: "", file:{}};
const chatHistory = [];
const MODEL_ID = "gemini-2.0-flash"; // Replace with your actual model ID
const GENERATE_CONTENT_API = "generateContent"; // Replace with your API method if different
const GEMINI_API_KEY = "AIzaSyA0ut3TgbdEU282FuSnDDS4417HlGeuu9A"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`;



//function to create message elements
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

//scroll to the bottom of the container
const scrollToBottom= () => { container.scrollTo({top: container.scrollHeight,behavior:"smooth"});

}
//simulate typing effect for bot responses
const typingEffect = (text, textElement) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  const typingInterval = setInterval(() => {
    if (isStopped) {  // Stop typing immediately if button was pressed
      clearInterval(typingInterval);
      return;
    }
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};
//make the api call and generate the bot's message
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller= new AbortController();
  isStopped=false;

  //add user msg and file data to chat history
  chatHistory.push({ role: "user",
     parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({fileName,isImage, ...rest}) =>
    rest)(userData.file) }] : [])]
   });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    if(isStopped) return;
    const data = await response.json();
    console.log("API Response:", data); // Debugging line

    if (!response.ok || !data.candidates) throw new Error("Invalid API Response");

    const responseText = data.candidates[0]?.content?.parts?.[0]?.text || "No response";
    
    typingEffect(responseText, textElement,botMsgDiv);
    chatHistory.push({ role: "model",parts: [{ text: responseText },]});
  } catch (error) {
    textElement.style.color = "#d62939";
    textElement.textContent = "Response generation stopped.";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  } finally{
    userData.file= {};
  }
}


//handle the form submission
const handleFormSubmit= (e)=> {
  e.preventDefault();
  const userMessage=promptInput.value.trim();
  if(!userMessage || document.body.classList.contains("bot-responding")) return;

  promptInput.value="";
  userData.message=userMessage;
  document.body.classList.add("bot-responding","chats-active");
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  //generate user message HTML and add in the chats container
  const userMsgHTML= `
  <p class="message-text">${userData.message}</p>
  ${userData.file.data 
    ? (userData.file.isImage 
      ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>` 
      : `<p class="file-attachment"><span class="material-symbols-rounded">Description</span> ${userData.file.fileName}</p>`) 
    : ""}
`;
  const userMsgDiv=createMsgElement(userMsgHTML,"user-message");


  userMsgDiv.querySelector(".message-text").textContent=userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

setTimeout(() =>{
  //generate bot message HTML and add in the chats container in 600ms
  const botMsgHTML='<img src="a-logo.png" class="avatar"><p class="message-text">Just a sec...</p>';
  const botMsgDiv=createMsgElement(botMsgHTML,"bot-message", "loading");
  chatsContainer.appendChild(botMsgDiv);
  scrollToBottom();
  generateResponse(botMsgDiv);
},600);
}
//handle file input change(file upload)
fileInput.addEventListener("change",()=>{
  const  file=fileInput.files[0];
  if(!file) return ;

  const isImage=file.type.startsWith("image/");
  const reader=new FileReader();
  reader.readAsDataURL(file);

  reader.onload= (e) =>{
    fileInput.value="";
const base64String=e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src= e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    //store file data in userData obj
    userData.file= {fileName: file.name,data:base64String,mime_type:file.type,isImage};
  }
});

//cancel upload file
document.querySelector("#cancel-file-btn").addEventListener("click", () =>{
  userData.file={};
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

//stop response button
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  isStopped = true;
  if (controller) controller.abort();
  if (typingInterval) clearInterval(typingInterval);
  const botMessage = document.querySelector(".bot-message.loading");
  if (botMessage) {
    botMessage.classList.remove("loading");
    const textElement = botMessage.querySelector(".message-text");
    textElement.style.color = "#d62939";
    textElement.textContent = "Response generation stopped.";
  }
  document.body.classList.remove("bot-responding");
  console.log("Response stopped!");
});

//delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () =>{
 chatHistory.length =0;
 chatsContainer.innerHTML="";
 document.body.classList.remove("bot-responding","chats-active");
});
//Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach(item=>{
item.addEventListener("click",() =>{
promptInput.value=item.querySelector(".text").textContent;
promptForm.dispatchEvent(new Event("submit"));
});
});

//Toggle dark/light theme
themeToggle.addEventListener("click", ()=>
{
  const isLightTheme=document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor",isLightTheme ? "light_mode" : "dark_mode");
  themeToggle.textContent=isLightTheme ? "dark_mode" : "light_mode";
});
const isLightTheme=localStorage.getItem("themeColor")=== "light_mode";
document.body.classList.toggle("light-theme",isLightTheme);
  themeToggle.textContent=isLightTheme ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit",handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click",()=> fileInput.click());
document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove("active"));
            
            // Hide all content sections
            contents.forEach(content => content.classList.remove("active"));
            
            // Add active class to the clicked tab
            this.classList.add("active");
            
            // Show the corresponding content
            const target = this.getAttribute("data-target");
            document.getElementById(target).classList.add("active");
        });
    });
});
document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove("active"));
            
            // Hide all content sections
            contents.forEach(content => content.classList.remove("active"));
            
            // Add active class to the clicked tab
            this.classList.add("active");
            
            // Show the corresponding content
            const target = this.getAttribute("data-target");
            document.getElementById(target).classList.add("active");
        });
    });

    // Default to show Home tab
    document.querySelector(".tab-btn[data-target='home-content']").classList.add("active");
    document.getElementById("home-content").classList.add("active");
});