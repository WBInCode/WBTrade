require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Check total products
    const total = await prisma.product.count({ where: { price: { gt: 0 } } });
    console.log('=== Total products (price > 0):', total);
    console.log('');
    
    // Get main categories
    const mainCategories = await prisma.category.findMany({
      where: { parentId: null, order: { gt: 0 }, isActive: true },
      orderBy: { order: 'asc' }
    });
    
    let grandTotal = 0;
    
    for (const cat of mainCategories) {
      // Direct products in main category
      const directCount = await prisma.product.count({ 
        where: { categoryId: cat.id, price: { gt: 0 } } 
      });
      
      // Get children
      const children = await prisma.category.findMany({ 
        where: { parentId: cat.id, isActive: true } 
      });
      
      let childTotal = 0;
      let childDetails = [];
      
      for (const child of children) {
        const childCount = await prisma.product.count({ 
          where: { categoryId: child.id, price: { gt: 0 } } 
        });
        childTotal += childCount;
        
        // Get grandchildren
        const grandchildren = await prisma.category.findMany({
          where: { parentId: child.id, isActive: true }
        });
        
        let grandchildTotal = 0;
        for (const gc of grandchildren) {
          const gcCount = await prisma.product.count({
            where: { categoryId: gc.id, price: { gt: 0 } }
          });
          grandchildTotal += gcCount;
        }
        
        if (childCount > 0 || grandchildTotal > 0) {
          childDetails.push({
            name: child.name,
            direct: childCount,
            grandchildren: grandchildTotal,
            total: childCount + grandchildTotal
          });
        }
        
        childTotal += grandchildTotal;
      }
      
      const categoryTotal = directCount + childTotal;
      grandTotal += categoryTotal;
      
      console.log(`📁 ${cat.name}`);
      console.log(`   Direct: ${directCount}, From subcategories: ${childTotal}, TOTAL: ${categoryTotal}`);
      
      // Show largest subcategories
      childDetails.sort((a, b) => b.total - a.total);
      for (const cd of childDetails.slice(0, 3)) {
        if (cd.total > 0) {
          console.log(`     - ${cd.name}: ${cd.total}`);
        }
      }
      console.log('');
    }
    
    console.log('=== Sum of all categories:', grandTotal);
    console.log('=== Difference from total:', total - grandTotal);
    
    // Check products without valid category or in "Inne"
    const inneCategory = await prisma.category.findFirst({ where: { slug: 'inne' } });
    if (inneCategory) {
      const inneCount = await prisma.product.count({
        where: { categoryId: inneCategory.id, price: { gt: 0 } }
      });
      console.log('\n=== Products in "Inne" category:', inneCount);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
