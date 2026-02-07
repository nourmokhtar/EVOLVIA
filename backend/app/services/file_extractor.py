"""
File extraction service - extracts text content from various file formats.
Supports: PDF, DOCX, TXT, MD
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class FileExtractor:
    """Extracts text content from uploaded files"""
    
    @staticmethod
    async def extract_text(file_content: bytes, file_name: str) -> Optional[str]:
        """
        Extract text content from file based on extension.
        
        Args:
            file_content: Raw file bytes
            file_name: Original filename (used to determine type)
            
        Returns:
            Extracted text content or None if extraction fails
        """
        file_ext = os.path.splitext(file_name)[1].lower()
        
        try:
            if file_ext == '.pdf':
                return await FileExtractor._extract_pdf(file_content)
            elif file_ext in ['.docx', '.doc']:
                return await FileExtractor._extract_docx(file_content)
            elif file_ext in ['.txt', '.md']:
                return file_content.decode('utf-8', errors='ignore')
            else:
                logger.warning(f"Unsupported file type: {file_ext}")
                # Try to decode as text as fallback
                try:
                    return file_content.decode('utf-8', errors='ignore')
                except:
                    return None
        except Exception as e:
            logger.error(f"Error extracting text from {file_name}: {e}")
            return None
    
    @staticmethod
    async def _extract_pdf(file_content: bytes) -> Optional[str]:
        """Extract text from PDF file"""
        try:
            import PyPDF2
            import io
            
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page in pdf_reader.pages:
                text_parts.append(page.extract_text())
            
            return '\n\n'.join(text_parts)
        except ImportError:
            logger.warning("PyPDF2 not installed. Install with: pip install PyPDF2")
            return None
        except Exception as e:
            logger.error(f"Error extracting PDF: {e}")
            return None
    
    @staticmethod
    async def _extract_docx(file_content: bytes) -> Optional[str]:
        """Extract text from DOCX file"""
        try:
            import docx
            import io
            
            doc_file = io.BytesIO(file_content)
            doc = docx.Document(doc_file)
            
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            return '\n\n'.join(text_parts)
        except ImportError:
            logger.warning("python-docx not installed. Install with: pip install python-docx")
            return None
        except Exception as e:
            logger.error(f"Error extracting DOCX: {e}")
            return None


file_extractor = FileExtractor()
